import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.household import Household
from app.models.listing import Listing
from app.models.match import MatchInterest
from app.models.user import User
from app.schemas.match import (
    CompatibilityResponse,
    InterestCreate,
    InterestDetailResponse,
    InterestResponse,
    InterestUpdate,
)
from app.services.matching_engine import MatchingEngine

router = APIRouter()


def _derive_match_reasons(breakdown: dict) -> list[str]:
    reasons = []
    dims = breakdown.get("dimensions", {})
    if dims.get("sleep_schedule", 0) >= 8:
        reasons.append("Similar sleep schedule")
    if dims.get("cleanliness_level", 0) >= 10:
        reasons.append("Matching cleanliness standards")
    if dims.get("noise_tolerance", 0) >= 7:
        reasons.append("Compatible noise preferences")
    if dims.get("pet_friendly", 0) >= 4:
        reasons.append("Both pet friendly")
    if dims.get("smoking", 0) >= 8:
        reasons.append("Matching smoking preference")
    if breakdown.get("budget_score", 0) >= 7:
        reasons.append("Budget compatible")
    if breakdown.get("trust_score", 0) >= 7:
        reasons.append("Similar trust levels")
    return reasons[:4] if reasons else ["Lifestyle compatible"]


# ─── UH-302: Valid status transitions ────────────────────────────────────────
VALID_TRANSITIONS: dict[str, set[str]] = {
    "interested": {"shortlisted", "accepted", "rejected", "archived"},
    "shortlisted": {"accepted", "rejected", "archived"},
    "accepted": {"mutual", "rejected", "archived"},
    "mutual": {"archived"},      # Can only archive after mutual
    "touring": {"approved", "rejected", "archived"},
    "approved": {"closed", "archived"},
    "rejected": {"archived"},    # Can only archive rejected
    "archived": set(),           # Terminal
    "closed": set(),             # Terminal
}


def _validate_transition(current: str, target: str) -> bool:
    allowed = VALID_TRANSITIONS.get(current, set())
    return target in allowed


@router.get("/recommendations", response_model=list)
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Listing).where(Listing.status == "active")

    if current_user.looking_in:
        query = query.where(Listing.city.in_(current_user.looking_in))
    if current_user.budget_min:
        query = query.where(Listing.rent_monthly >= current_user.budget_min)
    if current_user.budget_max:
        query = query.where(Listing.rent_monthly <= current_user.budget_max)

    query = query.limit(50)
    result = await db.execute(query)
    listings = list(result.scalars().all())

    engine = MatchingEngine()
    recommendations = []

    for listing in listings:
        host_result = await db.execute(select(User).where(User.id == listing.host_id))
        host = host_result.scalar_one_or_none()
        if not host or host.id == current_user.id:
            continue

        compat = engine.calculate_compatibility(current_user, host)
        match_pct = int(round(compat["total_score"]))
        match_reasons = _derive_match_reasons(compat.get("breakdown", {}))

        # Avg roommate trust from linked household
        avg_roommate_trust: float | None = None
        hh_result = await db.execute(select(Household).where(Household.listing_id == listing.id))
        household = hh_result.scalar_one_or_none()
        if household:
            members_result = await db.execute(select(User).where(User.household_id == household.id))
            members = list(members_result.scalars().all())
            if members:
                avg_roommate_trust = round(sum(float(m.trust_score) for m in members) / len(members), 1)

        # Highlights: short human-readable callouts
        highlights = []
        if listing.utilities_included:
            highlights.append("Utilities included")
        if listing.is_verified:
            highlights.append("Verified listing")
        if listing.transit_walk_mins is not None and listing.transit_walk_mins <= 10:
            highlights.append(f"{listing.transit_walk_mins} min to transit")
        if avg_roommate_trust is not None and avg_roommate_trust >= 70:
            highlights.append("Highly trusted household")

        recommendations.append({
            "listing_id": str(listing.id),
            "title": listing.title,
            "city": listing.city,
            "rent_monthly": listing.rent_monthly,
            "room_type": listing.room_type,
            "images": listing.images,
            "compatibility": compat,
            "match_percentage": match_pct,
            "match_reasons": match_reasons,
            "avg_roommate_trust": avg_roommate_trust,
            "highlights": highlights,
        })

    recommendations.sort(key=lambda r: r["compatibility"]["total_score"], reverse=True)
    return recommendations[:20]


@router.post("/interest", response_model=InterestResponse, status_code=status.HTTP_201_CREATED)
async def express_interest(
    data: InterestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    dup_query = select(MatchInterest).where(MatchInterest.from_user_id == current_user.id)
    if data.to_listing_id:
        dup_query = dup_query.where(MatchInterest.to_listing_id == data.to_listing_id)
    if data.to_user_id:
        dup_query = dup_query.where(MatchInterest.to_user_id == data.to_user_id)
    dup_result = await db.execute(dup_query)
    if dup_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Interest already expressed")

    interest = MatchInterest(
        from_user_id=current_user.id,
        to_listing_id=data.to_listing_id,
        to_user_id=data.to_user_id,
        message=data.message,
    )

    if data.to_user_id:
        target_result = await db.execute(select(User).where(User.id == data.to_user_id))
        target = target_result.scalar_one_or_none()
        if target:
            engine = MatchingEngine()
            compat = engine.calculate_compatibility(current_user, target)
            interest.compatibility_score = compat["total_score"]
    elif data.to_listing_id:
        listing_result = await db.execute(select(Listing).where(Listing.id == data.to_listing_id))
        listing = listing_result.scalar_one_or_none()
        if listing:
            host_result = await db.execute(select(User).where(User.id == listing.host_id))
            host = host_result.scalar_one_or_none()
            if host:
                engine = MatchingEngine()
                compat = engine.calculate_compatibility(current_user, host)
                interest.compatibility_score = compat["total_score"]

    db.add(interest)
    await db.flush()
    await db.refresh(interest)
    return interest


@router.get("/interests", response_model=list[InterestResponse])
async def get_my_interests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MatchInterest)
        .where(MatchInterest.from_user_id == current_user.id)
        .order_by(MatchInterest.created_at.desc())
    )
    return list(result.scalars().all())


# ─── UH-301: Received Interests Inbox (enriched) ─────────────────────────────
@router.get("/received", response_model=list[InterestDetailResponse])
async def get_received_interests(
    interest_status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Inbox of interests received — both listing-based and direct user-to-user."""
    # Get interests for listings I own
    listings_result = await db.execute(
        select(Listing).where(Listing.host_id == current_user.id)
    )
    my_listings = {l.id: l for l in listings_result.scalars().all()}
    listing_ids = list(my_listings.keys())

    conditions = [MatchInterest.to_user_id == current_user.id]
    if listing_ids:
        conditions.append(MatchInterest.to_listing_id.in_(listing_ids))

    query = select(MatchInterest).where(or_(*conditions))

    if interest_status and interest_status != "all":
        if interest_status == "new":
            query = query.where(MatchInterest.status == "interested")
        else:
            query = query.where(MatchInterest.status == interest_status)

    result = await db.execute(query.order_by(MatchInterest.created_at.desc()))
    interests = list(result.scalars().all())

    if not interests:
        return []

    # Batch-fetch sender users
    sender_ids = [i.from_user_id for i in interests]
    users_result = await db.execute(select(User).where(User.id.in_(sender_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    responses = []
    for interest in interests:
        sender = users_map.get(interest.from_user_id)
        listing = my_listings.get(interest.to_listing_id) if interest.to_listing_id else None

        responses.append(InterestDetailResponse(
            id=interest.id,
            from_user_id=interest.from_user_id,
            to_listing_id=interest.to_listing_id,
            to_user_id=interest.to_user_id,
            compatibility_score=float(interest.compatibility_score) if interest.compatibility_score else None,
            status=interest.status,
            message=interest.message,
            created_at=interest.created_at,
            applicant_name=sender.full_name if sender else "Unknown",
            applicant_avatar=sender.avatar_url if sender else None,
            applicant_trust_score=float(sender.trust_score) if sender else 0,
            applicant_occupation=sender.occupation if sender else None,
            applicant_city=sender.current_city if sender else None,
            listing_title=listing.title if listing else None,
        ))

    return responses


# ─── UH-302: Update interest with state machine validation ───────────────────
@router.patch("/interest/{interest_id}", response_model=InterestResponse)
async def update_interest(
    interest_id: uuid.UUID,
    data: InterestUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MatchInterest).where(MatchInterest.id == interest_id))
    interest = result.scalar_one_or_none()
    if not interest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interest not found")

    # Verify ownership
    is_sender = interest.from_user_id == current_user.id
    is_target = interest.to_user_id == current_user.id
    is_host = False
    if interest.to_listing_id:
        listing_check = await db.execute(
            select(Listing.host_id).where(Listing.id == interest.to_listing_id)
        )
        host_row = listing_check.first()
        is_host = host_row is not None and host_row[0] == current_user.id

    if not (is_sender or is_target or is_host):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this interest")

    target_status = data.status.value

    # Validate state transition
    if not _validate_transition(interest.status, target_status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition: '{interest.status}' -> '{target_status}'. "
                   f"Allowed: {', '.join(VALID_TRANSITIONS.get(interest.status, set())) or 'none (terminal state)'}",
        )

    interest.status = target_status
    await db.flush()
    await db.refresh(interest)
    return interest


@router.get("/connections", response_model=list[InterestDetailResponse])
async def get_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get mutual matches with enriched details."""
    result = await db.execute(
        select(MatchInterest)
        .where(
            and_(
                MatchInterest.status.in_(["mutual", "touring", "approved"]),
                or_(
                    MatchInterest.from_user_id == current_user.id,
                    MatchInterest.to_user_id == current_user.id,
                ),
            )
        )
        .order_by(MatchInterest.created_at.desc())
    )
    interests = list(result.scalars().all())

    if not interests:
        return []

    # Collect all user IDs for batch lookup
    user_ids = set()
    listing_ids = set()
    for i in interests:
        user_ids.add(i.from_user_id)
        if i.to_user_id:
            user_ids.add(i.to_user_id)
        if i.to_listing_id:
            listing_ids.add(i.to_listing_id)

    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    listings_map: dict[uuid.UUID, Listing] = {}
    if listing_ids:
        listings_result = await db.execute(select(Listing).where(Listing.id.in_(listing_ids)))
        listings_map = {l.id: l for l in listings_result.scalars().all()}

    responses = []
    for interest in interests:
        # The "other" person from current_user's perspective
        if interest.from_user_id == current_user.id:
            other_id = interest.to_user_id
            if not other_id and interest.to_listing_id:
                listing = listings_map.get(interest.to_listing_id)
                other_id = listing.host_id if listing else None
        else:
            other_id = interest.from_user_id

        other = users_map.get(other_id) if other_id else None
        listing = listings_map.get(interest.to_listing_id) if interest.to_listing_id else None

        responses.append(InterestDetailResponse(
            id=interest.id,
            from_user_id=interest.from_user_id,
            to_listing_id=interest.to_listing_id,
            to_user_id=interest.to_user_id,
            compatibility_score=float(interest.compatibility_score) if interest.compatibility_score else None,
            status=interest.status,
            message=interest.message,
            created_at=interest.created_at,
            applicant_name=other.full_name if other else "Unknown",
            applicant_avatar=other.avatar_url if other else None,
            applicant_trust_score=float(other.trust_score) if other else 0,
            applicant_occupation=other.occupation if other else None,
            applicant_city=other.current_city if other else None,
            listing_title=listing.title if listing else None,
        ))

    return responses


@router.get("/status-machine")
async def get_status_machine():
    """Return valid status transitions for client-side enforcement."""
    return {
        "statuses": list(VALID_TRANSITIONS.keys()),
        "transitions": {k: list(v) for k, v in VALID_TRANSITIONS.items()},
    }
