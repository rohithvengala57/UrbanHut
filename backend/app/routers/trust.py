import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.match import Vouch
from app.models.trust_score import TrustEvent, TrustSnapshot
from app.models.user import User
from app.schemas.trust import TrustActivityItem, TrustEventResponse, TrustScoreResponse, VouchCreate, VouchResponse
from app.services.analytics import track_backend_event
from app.services.trust_engine import TrustEngine

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


async def _get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    from app.utils.security import decode_token
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    return result.scalar_one_or_none()


EVENT_TITLES = {
    "email_verified": "Email verified",
    "phone_verified": "Phone verified",
    "photo_id_verified": "Government ID approved",
    "lease_uploaded": "Lease verification approved",
    "vouch_received": "Community vouch received",
    "vouch_given": "You vouched for another user",
}


async def _build_score_extras(
    user_id: uuid.UUID,
    snapshot,
    db: AsyncSession,
) -> dict:
    breakdown = {
        "verification": float(snapshot.verification_score),
        "financial": float(snapshot.financial_score),
        "household": float(snapshot.household_score),
        "tenure": float(snapshot.tenure_score),
        "community": float(snapshot.community_score),
    }

    events_result = await db.execute(
        select(TrustEvent)
        .where(TrustEvent.user_id == user_id)
        .order_by(TrustEvent.created_at.desc())
        .limit(10)
    )
    recent_events = list(events_result.scalars().all())
    recent_activity = [
        TrustActivityItem(
            type=EVENT_TITLES.get(e.event_type, e.event_type.replace("_", " ").title()),
            points=float(e.points_delta),
        )
        for e in recent_events
    ]

    suggestions = []
    if float(snapshot.verification_score) < 10:
        suggestions.append("Verify your phone number to boost your verification score")
    if float(snapshot.verification_score) < 15:
        suggestions.append("Upload a government ID for a significant trust boost")
    if float(snapshot.financial_score) < 15:
        suggestions.append("Link and verify a payment method to improve financial trust")
    if float(snapshot.household_score) < 10:
        suggestions.append("Join a household and contribute to chores and expenses")
    if float(snapshot.community_score) < 5:
        suggestions.append("Participate in community posts and vouch for trusted neighbors")
    if float(snapshot.tenure_score) < 5:
        suggestions.append("Accounts with longer tenure earn higher tenure scores over time")

    return {
        "breakdown": breakdown,
        "recent_activity": recent_activity,
        "improvement_suggestions": suggestions[:4],
    }


def _trend_explanation(trend: str | None) -> str | None:
    if trend == "rising":
        return "Your recent verified actions and positive household behavior are improving your score."
    if trend == "declining":
        return "Recent negative events reduced your score. Resolving missed household or financial actions will help."
    return "Your score is steady right now. Additional verified actions and positive consistency can raise it."


def _event_description(event: TrustEvent) -> str:
    meta = event.event_metadata or {}
    if event.event_type == "email_verified":
        return "Your email address was verified and now contributes to your trust score."
    if event.event_type == "phone_verified":
        phone = meta.get("phone")
        return f"Your phone number {phone} was verified." if phone else "Your phone number was verified."
    if event.event_type == "photo_id_verified":
        return "Your government ID submission was approved."
    if event.event_type == "lease_uploaded":
        return "Your lease or tenancy proof was approved."
    if event.event_type == "vouch_received":
        return "Another member vouched for you in the community."
    if event.event_type == "vouch_given":
        return "You vouched for another member."
    return event.event_type.replace("_", " ").capitalize()


@router.get("/score", response_model=TrustScoreResponse)
async def get_my_trust_score(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    engine = TrustEngine(db)
    snapshot = await engine.calculate(current_user.id)
    extras = await _build_score_extras(current_user.id, snapshot, db)

    await track_backend_event(
        db,
        event_name="trust_score_viewed",
        user_id=current_user.id,
        properties={"target_user_id": str(current_user.id), "is_self": True},
    )

    return TrustScoreResponse(
        total_score=float(snapshot.total_score),
        verification_score=float(snapshot.verification_score),
        financial_score=float(snapshot.financial_score),
        household_score=float(snapshot.household_score),
        tenure_score=float(snapshot.tenure_score),
        community_score=float(snapshot.community_score),
        trend=snapshot.trend,
        trend_explanation=_trend_explanation(snapshot.trend),
        calculated_at=snapshot.calculated_at,
        **extras,
    )


@router.get("/score/{user_id}", response_model=TrustScoreResponse)
async def get_user_trust_score(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(_get_optional_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    engine = TrustEngine(db)
    snapshot = await engine.calculate(user_id)
    extras = await _build_score_extras(user_id, snapshot, db)

    await track_backend_event(
        db,
        event_name="trust_score_viewed",
        user_id=current_user.id if current_user else None,
        properties={"target_user_id": str(user_id), "is_self": current_user.id == user_id if current_user else False},
    )

    return TrustScoreResponse(
        total_score=float(snapshot.total_score),
        verification_score=float(snapshot.verification_score),
        financial_score=float(snapshot.financial_score),
        household_score=float(snapshot.household_score),
        tenure_score=float(snapshot.tenure_score),
        community_score=float(snapshot.community_score),
        trend=snapshot.trend,
        trend_explanation=_trend_explanation(snapshot.trend),
        calculated_at=snapshot.calculated_at,
        **extras,
    )


@router.get("/history", response_model=list[TrustScoreResponse])
async def get_trust_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrustSnapshot)
        .where(TrustSnapshot.user_id == current_user.id)
        .order_by(TrustSnapshot.calculated_at.desc())
        .limit(52)  # Last year of weekly snapshots
    )
    return list(result.scalars().all())


@router.get("/events", response_model=list[TrustEventResponse])
async def get_trust_events(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrustEvent)
        .where(TrustEvent.user_id == current_user.id)
        .order_by(TrustEvent.created_at.desc())
        .limit(100)
    )
    events = list(result.scalars().all())
    return [
        TrustEventResponse(
            id=event.id,
            category=event.category,
            event_type=event.event_type,
            points_delta=float(event.points_delta),
            metadata=event.event_metadata,
            display_title=EVENT_TITLES.get(event.event_type, event.event_type.replace("_", " ").title()),
            display_description=_event_description(event),
            created_at=event.created_at,
        )
        for event in events
    ]


@router.post("/vouch/{user_id}", response_model=VouchResponse, status_code=status.HTTP_201_CREATED)
async def vouch_for_user(
    user_id: uuid.UUID,
    data: VouchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot vouch for yourself")

    # Check target exists
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check duplicate
    existing = await db.execute(
        select(Vouch).where(
            and_(Vouch.voucher_id == current_user.id, Vouch.vouchee_id == user_id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already vouched for this user")

    vouch = Vouch(
        voucher_id=current_user.id,
        vouchee_id=user_id,
        relationship=data.relationship,
        message=data.message,
    )
    db.add(vouch)

    # Record trust event
    engine = TrustEngine(db)
    await engine.record_event(user_id, "community", "vouch_received", 1.5, {"from": str(current_user.id)})
    await engine.record_event(current_user.id, "community", "vouch_given", 0.5, {"to": str(user_id)})

    await db.flush()
    await db.refresh(vouch)
    return vouch


@router.get("/vouches", response_model=list[VouchResponse])
async def get_vouches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vouch).where(Vouch.vouchee_id == current_user.id).order_by(Vouch.created_at.desc())
    )
    return list(result.scalars().all())
