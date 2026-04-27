import random
import uuid
from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.models.verification import Verification
from app.schemas.verification import PhoneOTPRequest, PhoneOTPVerify
from app.schemas.user import RefreshRequest, TokenResponse, UserCreate, UserLogin
from app.services.analytics import extract_attribution_from_request, track_backend_event
from app.services.trust_engine import TrustEngine, VERIFICATION_POINTS
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

log = structlog.get_logger("app.routers.auth")

# In-memory OTP store for dev (keyed by user_id → code)
_otp_store: dict[str, str] = {}
_phone_otp_store: dict[str, dict] = {}


class VerifyEmailRequest(BaseModel):
    code: str

router = APIRouter()


async def _get_or_create_verification(
    db: AsyncSession,
    user_id: uuid.UUID,
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
    user: User,
    verification: Verification,
    event_type: str,
    metadata: dict | None = None,
) -> None:
    if verification.points_awarded > 0:
        log.debug(
            "verification_points_already_awarded",
            user_id=str(user.id),
            event_type=event_type,
            points_already=verification.points_awarded,
        )
        return

    engine = TrustEngine(db)
    points = VERIFICATION_POINTS[event_type]
    log.info(
        "verification_points_awarding",
        user_id=str(user.id),
        event_type=event_type,
        points=points,
    )
    await engine.record_event(
        user.id,
        "verification",
        event_type,
        points,
        metadata,
    )
    verification.points_awarded = points
    await engine.calculate(user.id)


async def _store_refresh_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    raw_token: str,
    request: Request | None = None,
) -> RefreshToken:
    from app.config import settings
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    device_info = None
    if request:
        ua = request.headers.get("user-agent", "")
        device_info = ua[:255] if ua else None

    rt = RefreshToken(
        user_id=user_id,
        token_hash=RefreshToken.hash_token(raw_token),
        device_info=device_info,
        expires_at=expires_at,
    )
    db.add(rt)
    log.debug(
        "refresh_token_stored",
        user_id=str(user_id),
        expires_at=expires_at.isoformat(),
        device_info=device_info[:60] if device_info else None,
    )
    return rt


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(data: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    log.info("signup_attempt", email_domain=data.email.split("@")[-1] if "@" in data.email else "unknown")

    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        log.warning("signup_email_conflict", email_domain=data.email.split("@")[-1])
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    referred_by_id = None
    if data.referral_code:
        ref_result = await db.execute(select(User).where(User.referral_code == data.referral_code))
        referrer = ref_result.scalar_one_or_none()
        if referrer:
            referred_by_id = referrer.id
            log.info("signup_referral_applied", referrer_id=str(referred_by_id))
        else:
            log.warning("signup_invalid_referral_code", code=data.referral_code)

    # Generate a simple referral code: FIRSTNAME-RANDOM
    safe_name = "".join(filter(str.isalnum, data.full_name.split()[0])).upper()[:8]
    new_ref_code = f"{safe_name}-{random.randint(1000, 9999)}"

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        # Cold start: new users begin at 15 (not 0) so they appear presentable
        trust_score=15.0,
        referral_code=new_ref_code,
        referred_by_id=referred_by_id,
        onboarding_metadata={
            "steps": {
                "profile_completed": False,
                "email_verified": False,
                "identity_verified": False,
                "first_meaningful_action": False,
            }
        }
    )
    db.add(user)
    await db.flush()

    request_touch = extract_attribution_from_request(request)
    payload_touch = {
        "source": data.utm_source,
        "medium": data.utm_medium,
        "campaign": data.utm_campaign,
        "term": data.utm_term,
        "content": data.utm_content,
        "city": data.utm_city,
    }
    merged_touch = {k: v for k, v in {**(request_touch or {}), **payload_touch}.items() if v not in (None, "")}
    touch = merged_touch or None

    log.info(
        "signup_user_created",
        user_id=str(user.id),
        email_domain=data.email.split("@")[-1],
        trust_score_initial=15.0,
    )

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token_raw = create_refresh_token(token_data)

    await _store_refresh_token(db, user.id, refresh_token_raw, request)

    await track_backend_event(
        db,
        event_name="signup_completed",
        user_id=user.id,
        source="backend",
        properties={
            "referral_applied": referred_by_id is not None,
            "referral_code_entered": bool(data.referral_code),
        },
        first_touch=touch,
        last_touch=touch,
    )

    log.info("signup_complete", user_id=str(user.id))
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_raw,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    log.info("login_attempt", email_domain=data.email.split("@")[-1] if "@" in data.email else "unknown")

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        log.warning("login_failed_user_not_found", email_domain=data.email.split("@")[-1])
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not verify_password(data.password, user.password_hash):
        log.warning(
            "login_failed_wrong_password",
            user_id=str(user.id),
            account_status=user.status,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user.status != "active":
        log.warning(
            "login_failed_account_inactive",
            user_id=str(user.id),
            account_status=user.status,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token_raw = create_refresh_token(token_data)

    await _store_refresh_token(db, user.id, refresh_token_raw, request)

    log.info(
        "login_success",
        user_id=str(user.id),
        client_ip=request.client.host if request.client else "unknown",
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_raw,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)):
    log.debug("token_refresh_attempt")

    payload = decode_token(data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        log.warning(
            "token_refresh_failed",
            reason="invalid_or_wrong_type",
            token_type=payload.get("type") if payload else None,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        log.warning("token_refresh_failed", reason="user_not_found", user_id=user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Check token is stored and not revoked
    token_hash = RefreshToken.hash_token(data.refresh_token)
    rt_result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user.id,
        )
    )
    stored_token = rt_result.scalar_one_or_none()

    if not stored_token:
        log.warning(
            "token_refresh_failed",
            reason="token_not_found_in_db",
            user_id=str(user.id),
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked or not found")

    if stored_token.is_revoked:
        log.warning(
            "token_refresh_failed",
            reason="token_already_revoked",
            user_id=str(user.id),
            revoked_at=stored_token.revoked_at.isoformat() if stored_token.revoked_at else None,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked or not found")

    # Ensure stored_token.expires_at is timezone-aware for comparison
    expires_at = stored_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        log.warning(
            "token_refresh_failed",
            reason="token_expired",
            user_id=str(user.id),
            expired_at=stored_token.expires_at.isoformat(),
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    # Rotate: revoke old, issue new
    stored_token.revoked_at = datetime.now(timezone.utc)

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    new_refresh_token_raw = create_refresh_token(token_data)

    await _store_refresh_token(db, user.id, new_refresh_token_raw, request)

    log.info("token_refresh_success", user_id=str(user.id))
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token_raw,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    data: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke the provided refresh token. Client should discard both tokens."""
    token_hash = RefreshToken.hash_token(data.refresh_token)
    rt_result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == current_user.id,
        )
    )
    stored_token = rt_result.scalar_one_or_none()
    if stored_token and not stored_token.is_revoked:
        stored_token.revoked_at = datetime.now(timezone.utc)
        log.info("logout_success", user_id=str(current_user.id))
    else:
        log.debug(
            "logout_token_already_revoked_or_missing",
            user_id=str(current_user.id),
            found=stored_token is not None,
        )


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke all refresh tokens for the current user (e.g. on password change)."""
    from sqlalchemy import update
    result = await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )
    log.info(
        "logout_all_sessions",
        user_id=str(current_user.id),
        tokens_revoked=result.rowcount if hasattr(result, "rowcount") else "unknown",
    )


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    data: VerifyEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_key = str(current_user.id)
    stored = _otp_store.get(user_key)

    log.info("email_verification_attempt", user_id=str(current_user.id))

    # Accept if code matches stored OTP or if no OTP was generated (dev mode: accept any 6-digit code)
    if stored and data.code != stored:
        log.warning(
            "email_verification_code_mismatch",
            user_id=str(current_user.id),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")
    if not stored and len(data.code) != 6:
        log.warning(
            "email_verification_invalid_code_format",
            user_id=str(current_user.id),
            code_length=len(data.code),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a 6-digit code")

    _otp_store.pop(user_key, None)
    verification = await _get_or_create_verification(db, current_user.id, "email")
    verification.status = "verified"
    verification.verified_at = datetime.now(timezone.utc)
    verification.submitted_at = verification.submitted_at or datetime.now(timezone.utc)
    verification.reviewed_at = verification.verified_at
    verification.review_notes = "Verified via email OTP"
    await _award_verification_points(
        db,
        current_user,
        verification,
        "email_verified",
        {"email": current_user.email},
    )

    # Update onboarding metadata
    if current_user.onboarding_metadata and "steps" in current_user.onboarding_metadata:
        current_user.onboarding_metadata["steps"]["email_verified"] = True
        sa.orm.attributes.flag_modified(current_user, "onboarding_metadata")

    log.info("email_verification_success", user_id=str(current_user.id))
    return {"message": "Email verified successfully"}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = str(random.randint(100000, 999999))
    _otp_store[str(current_user.id)] = code
    verification = await _get_or_create_verification(db, current_user.id, "email")
    if verification.status != "verified":
        verification.status = "pending"
        verification.submitted_at = datetime.now(timezone.utc)

    log.info("email_verification_code_resent", user_id=str(current_user.id))
    # In production, send via email. In dev, return in response.
    return {"message": "Verification code sent", "dev_code": code}


@router.post("/phone/request-otp", status_code=status.HTTP_200_OK)
async def request_phone_otp(
    data: PhoneOTPRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    store_key = str(current_user.id)
    existing = _phone_otp_store.get(store_key)

    log.info(
        "phone_otp_requested",
        user_id=str(current_user.id),
        # Log only country code prefix, not full number
        phone_prefix=data.phone[:4] if len(data.phone) >= 4 else "short",
    )

    if existing and existing.get("locked_until") and now < existing["locked_until"]:
        log.warning(
            "phone_otp_locked",
            user_id=str(current_user.id),
            locked_until=existing["locked_until"].isoformat(),
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again later.",
        )
    if existing and existing.get("sent_at") and now - existing["sent_at"] < timedelta(seconds=30):
        log.warning(
            "phone_otp_too_soon",
            user_id=str(current_user.id),
            seconds_since_last=int((now - existing["sent_at"]).total_seconds()),
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another code.",
        )

    code = str(random.randint(100000, 999999))
    resend_count = (existing or {}).get("resend_count", 0) + 1
    _phone_otp_store[store_key] = {
        "code": code,
        "phone": data.phone,
        "attempt_count": 0,
        "resend_count": resend_count,
        "sent_at": now,
        "expires_at": now + timedelta(minutes=10),
        "locked_until": None,
    }

    verification = await _get_or_create_verification(db, current_user.id, "phone")
    if verification.status != "verified":
        verification.status = "pending"
        verification.submitted_at = now
        verification.verification_metadata = {"phone": data.phone, "resend_count": resend_count}

    log.info(
        "phone_otp_sent",
        user_id=str(current_user.id),
        resend_count=resend_count,
        expires_at=(now + timedelta(minutes=10)).isoformat(),
    )
    return {"message": "Phone OTP sent", "dev_code": code}


@router.post("/phone/verify-otp", status_code=status.HTTP_200_OK)
async def verify_phone_otp(
    data: PhoneOTPVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    store_key = str(current_user.id)
    challenge = _phone_otp_store.get(store_key)

    log.info("phone_otp_verify_attempt", user_id=str(current_user.id))

    if not challenge or challenge.get("phone") != data.phone:
        log.warning(
            "phone_otp_verify_no_challenge",
            user_id=str(current_user.id),
            has_challenge=challenge is not None,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request a code first")

    if challenge["expires_at"] < now:
        log.warning(
            "phone_otp_verify_expired",
            user_id=str(current_user.id),
            expired_at=challenge["expires_at"].isoformat(),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired. Request a new code.",
        )

    if challenge.get("locked_until") and now < challenge["locked_until"]:
        log.warning(
            "phone_otp_verify_locked",
            user_id=str(current_user.id),
            locked_until=challenge["locked_until"].isoformat(),
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again later.",
        )

    if challenge["code"] != data.code:
        challenge["attempt_count"] += 1
        attempts = challenge["attempt_count"]
        if attempts >= 5:
            challenge["locked_until"] = now + timedelta(minutes=15)
            log.warning(
                "phone_otp_verify_max_attempts_exceeded",
                user_id=str(current_user.id),
                attempts=attempts,
                locked_until=challenge["locked_until"].isoformat(),
            )
        else:
            log.warning(
                "phone_otp_verify_wrong_code",
                user_id=str(current_user.id),
                attempt=attempts,
                remaining=5 - attempts,
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    current_user.phone = data.phone
    verification = await _get_or_create_verification(db, current_user.id, "phone")
    verification.status = "verified"
    verification.verified_at = now
    verification.reviewed_at = now
    verification.review_notes = "Verified via phone OTP"
    verification.verification_metadata = {"phone": data.phone}
    await _award_verification_points(
        db,
        current_user,
        verification,
        "phone_verified",
        {"phone": data.phone},
    )
    _phone_otp_store.pop(store_key, None)
    log.info("phone_verification_success", user_id=str(current_user.id))
    return {"message": "Phone verified successfully"}


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log.warning(
        "account_deletion_initiated",
        user_id=str(current_user.id),
        email_domain=current_user.email.split("@")[-1] if current_user.email else "unknown",
    )
    await db.delete(current_user)
    log.info("account_deleted", user_id=str(current_user.id))
