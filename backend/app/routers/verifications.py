import uuid
from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.verification import Verification
from app.schemas.verification import (
    VerificationResponse,
    VerificationReviewRequest,
)
from app.services.trust_engine import TrustEngine, VERIFICATION_POINTS
from app.utils.s3 import (
    generate_presigned_download_url,
    generate_presigned_upload_url,
    verification_key,
)

log = structlog.get_logger("app.routers.verifications")
router = APIRouter()


class UploadUrlRequest(BaseModel):
    doc_type: str  # "id" or "lease"
    filename: str
    content_type: str = "image/jpeg"


class UploadUrlResponse(BaseModel):
    upload_url: str   # Presigned PUT URL for client
    s3_key: str       # Key to send back when calling submit endpoint


class DocumentSubmit(BaseModel):
    s3_key: str       # Key returned from /upload-url
    notes: str | None = None


def _verification_event_type(verification_type: str) -> str:
    return {
        "email": "email_verified",
        "phone": "phone_verified",
        "id": "photo_id_verified",
        "lease": "lease_uploaded",
    }[verification_type]


async def _get_or_create_verification(
    db: AsyncSession,
    user_id,
    verification_type: str,
) -> Verification:
    result = await db.execute(
        select(Verification)
        .where(Verification.user_id == user_id, Verification.type == verification_type)
        .order_by(Verification.created_at.desc())
    )
    verification = result.scalars().first()
    if verification:
        return verification

    log.debug(
        "verification_record_created",
        user_id=str(user_id),
        verification_type=verification_type,
    )
    verification = Verification(user_id=user_id, type=verification_type, status="not_started")
    db.add(verification)
    await db.flush()
    return verification


async def _award_verification_points(
    db: AsyncSession,
    current_user: User,
    verification: Verification,
) -> None:
    if verification.points_awarded > 0:
        log.debug(
            "verification_points_already_awarded",
            user_id=str(current_user.id),
            verification_type=verification.type,
            points_already=verification.points_awarded,
        )
        return

    try:
        event_type = _verification_event_type(verification.type)
        points = VERIFICATION_POINTS[event_type]
    except KeyError:
        log.error(
            "verification_unknown_type_for_points",
            user_id=str(current_user.id),
            verification_type=verification.type,
        )
        return

    engine = TrustEngine(db)
    metadata = verification.verification_metadata or {}
    log.info(
        "verification_points_awarding",
        user_id=str(current_user.id),
        verification_type=verification.type,
        event_type=event_type,
        points=points,
    )
    await engine.record_event(
        current_user.id,
        "verification",
        event_type,
        points,
        metadata,
    )
    verification.points_awarded = points
    await engine.calculate(current_user.id)


@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    data: UploadUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Return a presigned S3 PUT URL for the client to upload a verification
    document directly. The document lands in a private S3 bucket.
    """
    if data.doc_type not in ("id", "lease"):
        log.warning(
            "verification_invalid_doc_type",
            user_id=str(current_user.id),
            doc_type=data.doc_type,
        )
        raise HTTPException(status_code=400, detail="doc_type must be 'id' or 'lease'")

    key = verification_key(str(current_user.id), data.doc_type, data.filename)

    log.info(
        "verification_upload_url_requested",
        user_id=str(current_user.id),
        doc_type=data.doc_type,
        s3_key=key,
        content_type=data.content_type,
    )

    try:
        upload_url = generate_presigned_upload_url(key, data.content_type)
    except Exception as exc:
        log.error(
            "verification_upload_url_generation_failed",
            user_id=str(current_user.id),
            doc_type=data.doc_type,
            s3_key=key,
            error=str(exc),
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")

    return UploadUrlResponse(upload_url=upload_url, s3_key=key)


@router.get("/me", response_model=list[VerificationResponse])
async def get_my_verifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Verification)
        .where(Verification.user_id == current_user.id)
        .order_by(Verification.created_at.desc())
    )
    verifications = list(result.scalars().all())
    log.debug(
        "verifications_fetched",
        user_id=str(current_user.id),
        count=len(verifications),
    )
    return verifications


@router.post("/id", response_model=VerificationResponse, status_code=status.HTTP_201_CREATED)
async def submit_id_verification(
    data: DocumentSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit S3 key for ID document. Only the key is stored — never a public URL."""
    expected_prefix = f"verifications/{current_user.id}/id/"
    if not data.s3_key.startswith(expected_prefix):
        log.warning(
            "verification_invalid_s3_key",
            user_id=str(current_user.id),
            doc_type="id",
            s3_key=data.s3_key,
            expected_prefix=expected_prefix,
        )
        raise HTTPException(status_code=400, detail="Invalid S3 key for this user/doc type")

    log.info(
        "verification_id_submitted",
        user_id=str(current_user.id),
        s3_key=data.s3_key,
    )
    verification = await _get_or_create_verification(db, current_user.id, "id")
    verification.status = "pending"
    verification.document_url = data.s3_key   # Store key, not a URL
    verification.submitted_at = datetime.now(timezone.utc)
    verification.reviewed_at = None
    verification.verified_at = None
    verification.review_notes = None
    verification.verification_metadata = {"notes": data.notes} if data.notes else None
    verification.points_awarded = 0
    return verification


@router.post("/lease", response_model=VerificationResponse, status_code=status.HTTP_201_CREATED)
async def submit_lease_verification(
    data: DocumentSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit S3 key for lease document. Only the key is stored — never a public URL."""
    expected_prefix = f"verifications/{current_user.id}/lease/"
    if not data.s3_key.startswith(expected_prefix):
        log.warning(
            "verification_invalid_s3_key",
            user_id=str(current_user.id),
            doc_type="lease",
            s3_key=data.s3_key,
            expected_prefix=expected_prefix,
        )
        raise HTTPException(status_code=400, detail="Invalid S3 key for this user/doc type")

    log.info(
        "verification_lease_submitted",
        user_id=str(current_user.id),
        s3_key=data.s3_key,
    )
    verification = await _get_or_create_verification(db, current_user.id, "lease")
    verification.status = "pending"
    verification.document_url = data.s3_key
    verification.submitted_at = datetime.now(timezone.utc)
    verification.reviewed_at = None
    verification.verified_at = None
    verification.review_notes = None
    verification.verification_metadata = {"notes": data.notes} if data.notes else None
    verification.points_awarded = 0
    return verification


@router.get("/{verification_id}/document-url")
async def get_document_url(
    verification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin-only: get a 15-minute presigned URL to view a verification document.
    Documents are stored privately in S3; this is the only access path.
    """
    if current_user.role != "admin":
        log.warning(
            "verification_document_access_denied",
            user_id=str(current_user.id),
            verification_id=str(verification_id),
            user_role=current_user.role,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    result = await db.execute(select(Verification).where(Verification.id == verification_id))
    verification = result.scalar_one_or_none()
    if not verification or not verification.document_url:
        log.info(
            "verification_document_not_found",
            admin_user_id=str(current_user.id),
            verification_id=str(verification_id),
            found=verification is not None,
            has_document=verification.document_url is not None if verification else False,
        )
        raise HTTPException(status_code=404, detail="Verification or document not found")

    log.info(
        "verification_document_url_generated",
        admin_user_id=str(current_user.id),
        verification_id=str(verification_id),
        subject_user_id=str(verification.user_id),
        verification_type=verification.type,
        s3_key=verification.document_url,
    )

    try:
        presigned_url = generate_presigned_download_url(verification.document_url)
    except Exception as exc:
        log.error(
            "verification_presigned_download_failed",
            admin_user_id=str(current_user.id),
            verification_id=str(verification_id),
            s3_key=verification.document_url,
            error=str(exc),
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to generate document access URL")

    return {"url": presigned_url, "expires_in_seconds": 900}


@router.patch("/{verification_id}/review", response_model=VerificationResponse)
async def review_verification(
    verification_id: uuid.UUID,
    data: VerificationReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin":
        log.warning(
            "verification_review_access_denied",
            user_id=str(current_user.id),
            verification_id=str(verification_id),
            user_role=current_user.role,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can review verifications",
        )

    if data.status not in {"approved", "rejected"}:
        log.warning(
            "verification_review_invalid_status",
            admin_user_id=str(current_user.id),
            requested_status=data.status,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review status",
        )

    result = await db.execute(select(Verification).where(Verification.id == verification_id))
    verification = result.scalar_one_or_none()
    if not verification:
        log.info(
            "verification_review_not_found",
            admin_user_id=str(current_user.id),
            verification_id=str(verification_id),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification not found")

    user_result = await db.execute(select(User).where(User.id == verification.user_id))
    verification_user = user_result.scalar_one_or_none()
    if not verification_user:
        log.error(
            "verification_review_user_missing",
            admin_user_id=str(current_user.id),
            verification_id=str(verification_id),
            subject_user_id=str(verification.user_id),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    previous_status = verification.status
    verification.status = data.status
    verification.reviewed_at = datetime.now(timezone.utc)
    verification.review_notes = data.review_notes

    if data.status == "approved":
        verification.verified_at = datetime.now(timezone.utc)
        await _award_verification_points(db, verification_user, verification)

        # Data retention: after approval we keep the key for 30 days then a background
        # job should call s3.delete_object(verification.document_url). Flag via metadata.
        meta = verification.verification_metadata or {}
        approved_at = datetime.now(timezone.utc)
        meta["approved_at"] = approved_at.isoformat()
        meta["delete_after"] = (approved_at + timedelta(days=30)).isoformat()
        verification.verification_metadata = meta

        log.info(
            "verification_approved",
            admin_user_id=str(current_user.id),
            verification_id=str(verification_id),
            subject_user_id=str(verification.user_id),
            verification_type=verification.type,
            previous_status=previous_status,
        )
    else:
        verification.verified_at = None
        verification.points_awarded = 0
        log.info(
            "verification_rejected",
            admin_user_id=str(current_user.id),
            verification_id=str(verification_id),
            subject_user_id=str(verification.user_id),
            verification_type=verification.type,
            previous_status=previous_status,
            review_notes=data.review_notes,
        )

    return verification
