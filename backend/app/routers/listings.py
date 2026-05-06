import uuid
from datetime import date, datetime, timezone

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger("app.routers.listings")

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.household import Household
from app.models.listing import Listing
from app.models.match import MatchInterest
from app.models.user import User
from app.models.inquiry import ListingInquiry
from app.schemas.inquiry import InquiryCreate, InquiryResponse
from app.schemas.listing import (
    FunnelStep,
    ListingCreate,
    ListingMetricsResponse,
    ListingResponse,
    ListingStatusUpdate,
    ListingUpdate,
    MyListingResponse,
    RoommateCard,
)
from app.schemas.match import InterestDetailResponse, InterestStatus
from app.services.analytics import track_backend_event
from app.services.matching_engine import MatchingEngine
from app.services.notification_service import NotificationService
from app.utils.geocoding import geocode_address
from app.utils.s3 import listing_image_prefix, process_and_upload_image

_notifier = NotificationService()

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


def _roommate_traits(member: User) -> list[str]:
    traits = []
    if member.sleep_schedule:
        traits.append(f"{member.sleep_schedule.replace('_', ' ').title()} sleeper")
    cleanliness = getattr(member, "cleanliness_level", None)
    if cleanliness is not None:
        if cleanliness >= 4:
            traits.append("Very clean")
        elif cleanliness >= 3:
            traits.append("Moderately clean")
    if getattr(member, "smoking", None) is False:
        traits.append("Non-smoker")
    if getattr(member, "pet_friendly", None) is True:
        traits.append("Pet friendly")
    if getattr(member, "noise_tolerance", None):
        traits.append(f"{member.noise_tolerance.replace('_', ' ').title()} noise tolerance")
    return traits[:4]


async def _get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Return the current user if a valid token is present, otherwise None."""
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


def _relevance_score(
    listing: Listing,
    host: User | None,
    seeker: User | None,
    engine: MatchingEngine,
    now: datetime,
) -> float:
    """
    relevance = compatibility * 0.4 + host_trust * 0.2 + recency * 0.2
              + verification_bonus * 0.1 + image_bonus * 0.1
    """
    # Compatibility (0–100 → 0–1)
    if seeker and host and seeker.id != host.id:
        compat = engine.calculate_compatibility(seeker, host)["total_score"] / 100.0
    else:
        compat = 0.5  # neutral when not authenticated

    # Host trust (0–100 → 0–1)
    host_trust = float(host.trust_score) / 100.0 if host else 0.0

    # Recency decay: -0.03 per day
    if listing.created_at:
        listing_dt = listing.created_at
        if listing_dt.tzinfo is None:
            listing_dt = listing_dt.replace(tzinfo=timezone.utc)
        days_old = max(0, (now - listing_dt).days)
        recency = max(0.0, 1.0 - 0.03 * days_old)
    else:
        recency = 0.5

    # Verification bonus
    verification_bonus = 1.0 if listing.is_verified else 0.0

    # Image bonus
    image_count = len(listing.images) if listing.images else 0
    image_bonus = min(image_count / 5.0, 1.0)

    return (
        compat * 0.4
        + host_trust * 0.2
        + recency * 0.2
        + verification_bonus * 0.1
        + image_bonus * 0.1
    )


# ─── UH-201: Advanced Search (public, active-only) ───────────────────────────
@router.get("/", response_model=list[ListingResponse])
async def search_listings(
    city: str | None = None,
    state: str | None = None,
    zip_code: str | None = None,
    price_min: int | None = None,
    price_max: int | None = None,
    room_type: str | None = None,
    property_type: str | None = None,
    available_from: date | None = None,
    utilities_included: bool | None = None,
    min_trust: float | None = None,
    sort_by: str = "relevance",
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(_get_optional_user),
):
    """
    Search active listings with advanced filters.
    sort_by: relevance (default) | price_asc | price_desc | created_at
    Relevance = compatibility*0.4 + trust*0.2 + recency*0.2 + verified*0.1 + images*0.1
    """
    log.debug(
        "listings_search",
        city=city,
        state=state,
        zip_code=zip_code,
        price_min=price_min,
        price_max=price_max,
        sort_by=sort_by,
        page=page,
        per_page=per_page,
        authenticated=current_user is not None,
    )
    await track_backend_event(
        db,
        event_name="search_performed",
        user_id=current_user.id if current_user else None,
        properties={
            "city": city,
            "state": state,
            "price_min": price_min,
            "price_max": price_max,
            "room_type": room_type,
            "property_type": property_type,
            "sort_by": sort_by,
        },
    )
    query = select(Listing).where(Listing.status == "active")

    if city:
        query = query.where(Listing.city.ilike(f"%{city}%"))
    if state:
        query = query.where(Listing.state.ilike(f"%{state}%"))
    if zip_code:
        query = query.where(Listing.zip_code.ilike(f"%{zip_code}%"))
    if price_min is not None:
        query = query.where(Listing.rent_monthly >= price_min)
    if price_max is not None:
        query = query.where(Listing.rent_monthly <= price_max)
    if room_type:
        query = query.where(Listing.room_type == room_type)
    if property_type:
        query = query.where(Listing.property_type == property_type)
    if available_from:
        query = query.where(Listing.available_from <= available_from)
    if utilities_included is not None:
        query = query.where(Listing.utilities_included == utilities_included)
    if min_trust is not None:
        host_trust_sq = select(User.id).where(User.trust_score >= min_trust).scalar_subquery()
        query = query.where(Listing.host_id.in_(host_trust_sq))

    if sort_by == "price_asc":
        query = query.order_by(Listing.rent_monthly.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Listing.rent_monthly.desc())
    elif sort_by == "relevance":
        # Fetch more for in-memory relevance sort, then paginate
        query = query.order_by(Listing.created_at.desc()).limit(200)
        result = await db.execute(query)
        listings = list(result.scalars().all())

        # Batch-fetch hosts
        host_ids = {l.host_id for l in listings}
        hosts_result = await db.execute(select(User).where(User.id.in_(host_ids)))
        hosts_map = {u.id: u for u in hosts_result.scalars().all()}

        engine = MatchingEngine()
        now = datetime.now(timezone.utc)
        scored = [
            (l, _relevance_score(l, hosts_map.get(l.host_id), current_user, engine, now))
            for l in listings
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        offset = (page - 1) * per_page
        return [l for l, _ in scored[offset: offset + per_page]]
    else:
        query = query.order_by(Listing.created_at.desc())

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all())


# ─── UH-203: Roommate Summary on Listing Detail ──────────────────────────────
@router.get("/roommate-summary/{listing_id}")
async def get_roommate_summary(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Anonymized roommate summary for a listing. No PII exposed."""
    listing_result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Find the household linked to this listing
    hh_result = await db.execute(select(Household).where(Household.listing_id == listing_id))
    household = hh_result.scalar_one_or_none()

    if not household:
        # No household yet - return basic info from listing itself
        return {
            "listing_id": str(listing_id),
            "household_size": listing.current_occupants,
            "available_spots": listing.available_spots,
            "avg_trust_score": 0,
            "occupants": [],
        }

    # Get household members
    members_result = await db.execute(
        select(User).where(User.household_id == household.id)
    )
    members = list(members_result.scalars().all())

    if not members:
        return {
            "listing_id": str(listing_id),
            "household_size": 0,
            "available_spots": listing.available_spots,
            "avg_trust_score": 0,
            "occupants": [],
        }

    avg_trust = sum(float(m.trust_score) for m in members) / len(members)

    # Build anonymized occupant cards
    labels = ["A", "B", "C", "D", "E", "F", "G", "H"]
    occupants = []
    for i, member in enumerate(members):
        trust_val = float(member.trust_score)
        if trust_val >= 75:
            trust_band = "Highly Trusted"
        elif trust_val >= 50:
            trust_band = "Trusted"
        elif trust_val >= 25:
            trust_band = "Building"
        else:
            trust_band = "New"

        # Tenure signal
        tenure_months = None
        if member.created_at:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            diff = now - member.created_at.replace(tzinfo=timezone.utc) if member.created_at.tzinfo is None else now - member.created_at
            tenure_months = max(0, int(diff.days / 30))

        occupants.append({
            "label": f"Roommate {labels[i] if i < len(labels) else i + 1}",
            "trust_band": trust_band,
            "lifestyle": {
                "sleep_schedule": member.sleep_schedule,
                "noise_tolerance": member.noise_tolerance,
                "cleanliness_level": member.cleanliness_level,
                "smoking": member.smoking,
                "pet_friendly": member.pet_friendly,
                "guest_frequency": member.guest_frequency,
            },
            "tenure_months": tenure_months,
            "occupation_type": member.occupation or "Not specified",
        })

    return {
        "listing_id": str(listing_id),
        "household_size": len(members),
        "available_spots": listing.available_spots,
        "avg_trust_score": round(avg_trust, 1),
        "occupants": occupants,
    }


# ─── UH-101: My Listings Dashboard ───────────────────────────────────────────
@router.get("/mine", response_model=list[MyListingResponse])
async def get_my_listings(
    listing_status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all listings owned by the current user, with interest counts."""
    query = select(Listing).where(Listing.host_id == current_user.id)

    if listing_status:
        query = query.where(Listing.status == listing_status)

    query = query.order_by(Listing.created_at.desc())
    result = await db.execute(query)
    listings = list(result.scalars().all())

    if not listings:
        return []

    listing_ids = [l.id for l in listings]

    # Batch-fetch interest counts per listing per status
    count_query = (
        select(
            MatchInterest.to_listing_id,
            MatchInterest.status,
            func.count(MatchInterest.id).label("cnt"),
        )
        .where(MatchInterest.to_listing_id.in_(listing_ids))
        .group_by(MatchInterest.to_listing_id, MatchInterest.status)
    )
    count_result = await db.execute(count_query)
    count_rows = count_result.all()

    # Build a map: listing_id -> {status -> count}
    counts_map: dict[uuid.UUID, dict[str, int]] = {}
    for lid, st, cnt in count_rows:
        counts_map.setdefault(lid, {})[st] = cnt

    response = []
    for listing in listings:
        status_counts = counts_map.get(listing.id, {})
        total_interests = sum(status_counts.values())
        new_interests = status_counts.get("interested", 0)
        shortlisted = status_counts.get("shortlisted", 0)
        accepted = status_counts.get("accepted", 0) + status_counts.get("mutual", 0)

        resp = MyListingResponse.model_validate(listing)
        resp.interest_count = total_interests
        resp.new_interest_count = new_interests
        resp.shortlist_count = shortlisted
        resp.accept_count = accepted
        response.append(resp)

    return response


# ─── Nearby listings count (insight card) ────────────────────────────────────
@router.get("/nearby-count")
async def nearby_count(
    city: str,
    db: AsyncSession = Depends(get_db),
):
    """Return the number of active listings in the given city. Used for home insight cards."""
    result = await db.execute(
        select(func.count(Listing.id)).where(
            and_(Listing.status == "active", Listing.city.ilike(f"%{city}%"))
        )
    )
    count = result.scalar_one()
    return {"city": city, "count": count}


# ─── Single listing (public) ─────────────────────────────────────────────────
@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(_get_optional_user),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    listing.view_count += 1
    await track_backend_event(
        db,
        event_name="listing_viewed",
        user_id=current_user.id if current_user else None,
        properties={"listing_id": str(listing_id), "city": listing.city, "rent": listing.rent_monthly},
    )
    await db.refresh(listing)

    response = ListingResponse.model_validate(listing)

    hh_result = await db.execute(select(Household).where(Household.listing_id == listing_id))
    household = hh_result.scalar_one_or_none()
    if household:
        members_result = await db.execute(select(User).where(User.household_id == household.id))
        members = list(members_result.scalars().all())
        if members:
            avg_trust = round(sum(float(m.trust_score) for m in members) / len(members), 1)
            roommates = [
                RoommateCard(
                    name=m.full_name.split()[0] if m.full_name else "Roommate",
                    trust_score=round(float(m.trust_score), 1),
                    traits=_roommate_traits(m),
                )
                for m in members
            ]
            response = response.model_copy(update={"avg_roommate_trust": avg_trust, "roommates": roommates})

    return response


# ─── UH-102: Listing Interest Inbox ──────────────────────────────────────────
@router.get("/{listing_id}/interests", response_model=list[InterestDetailResponse])
async def get_listing_interests(
    listing_id: uuid.UUID,
    interest_status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get incoming interests for a listing. Only the listing host can access."""
    # Verify ownership
    listing_result = await db.execute(
        select(Listing).where(and_(Listing.id == listing_id, Listing.host_id == current_user.id))
    )
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or you are not the host",
        )

    query = select(MatchInterest).where(MatchInterest.to_listing_id == listing_id)

    if interest_status and interest_status != "all":
        if interest_status == "new":
            query = query.where(MatchInterest.status == "interested")
        else:
            query = query.where(MatchInterest.status == interest_status)
    else:
        # By default hide rejected and archived from the active queue
        query = query.where(
            MatchInterest.status.notin_(["rejected", "archived"])
        )

    query = query.order_by(MatchInterest.created_at.desc())
    result = await db.execute(query)
    interests = list(result.scalars().all())

    if not interests:
        return []

    # Batch-fetch applicant user details
    user_ids = [i.from_user_id for i in interests]
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    response = []
    for interest in interests:
        applicant = users_map.get(interest.from_user_id)
        detail = InterestDetailResponse(
            id=interest.id,
            from_user_id=interest.from_user_id,
            to_listing_id=interest.to_listing_id,
            to_user_id=interest.to_user_id,
            compatibility_score=float(interest.compatibility_score) if interest.compatibility_score else None,
            status=interest.status,
            message=interest.message,
            created_at=interest.created_at,
            applicant_name=applicant.full_name if applicant else "Unknown",
            applicant_avatar=applicant.avatar_url if applicant else None,
            applicant_trust_score=float(applicant.trust_score) if applicant else 0,
            applicant_occupation=applicant.occupation if applicant else None,
            applicant_city=applicant.current_city if applicant else None,
            listing_title=listing.title,
        )
        response.append(detail)

    return response


# ─── UH-104: Listing Performance Metrics ─────────────────────────────────────
@router.get("/{listing_id}/metrics", response_model=ListingMetricsResponse)
async def get_listing_metrics(
    listing_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get performance metrics for a listing. Only the host can access."""
    listing_result = await db.execute(
        select(Listing).where(and_(Listing.id == listing_id, Listing.host_id == current_user.id))
    )
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or you are not the host",
        )

    # Count interests by status
    count_query = (
        select(
            MatchInterest.status,
            func.count(MatchInterest.id).label("cnt"),
        )
        .where(MatchInterest.to_listing_id == listing_id)
        .group_by(MatchInterest.status)
    )
    count_result = await db.execute(count_query)
    status_counts = {row[0]: row[1] for row in count_result.all()}

    total_interests = sum(status_counts.values())
    shortlist_count = status_counts.get("shortlisted", 0)
    accept_count = status_counts.get("accepted", 0) + status_counts.get("mutual", 0)
    reject_count = status_counts.get("rejected", 0)
    archive_count = status_counts.get("archived", 0)

    # Build conversion funnel
    view_count = listing.view_count or 0
    funnel = []
    if view_count > 0:
        funnel.append(FunnelStep(label="Views", count=view_count, percentage=100.0))
        funnel.append(FunnelStep(
            label="Interests",
            count=total_interests,
            percentage=round((total_interests / view_count) * 100, 1) if view_count > 0 else 0,
        ))
        funnel.append(FunnelStep(
            label="Shortlisted",
            count=shortlist_count,
            percentage=round((shortlist_count / view_count) * 100, 1) if view_count > 0 else 0,
        ))
        funnel.append(FunnelStep(
            label="Accepted",
            count=accept_count,
            percentage=round((accept_count / view_count) * 100, 1) if view_count > 0 else 0,
        ))

    return ListingMetricsResponse(
        listing_id=listing_id,
        view_count=view_count,
        interest_count=total_interests,
        shortlist_count=shortlist_count,
        accept_count=accept_count,
        reject_count=reject_count,
        archive_count=archive_count,
        funnel=funnel,
    )


# ─── Create listing ──────────────────────────────────────────────────────────
@router.post("/", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    data: ListingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log.info(
        "listing_create_started",
        user_id=str(current_user.id),
        city=data.city,
        state=data.state,
        rent_monthly=data.rent_monthly,
    )

    listing_data = data.model_dump()
    if listing_data.get("latitude") is None or listing_data.get("longitude") is None:
        log.debug(
            "listing_geocoding_required",
            user_id=str(current_user.id),
            city=data.city,
            state=data.state,
        )
        coordinates = await geocode_address(
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            zip_code=data.zip_code,
        )
        if coordinates:
            listing_data["latitude"], listing_data["longitude"] = coordinates
            log.info(
                "listing_geocoded",
                user_id=str(current_user.id),
                city=data.city,
                lat=round(coordinates[0], 4),
                lon=round(coordinates[1], 4),
            )
        else:
            log.warning(
                "listing_geocoding_failed",
                user_id=str(current_user.id),
                city=data.city,
                state=data.state,
                zip_code=data.zip_code,
                impact="listing_will_not_appear_on_map",
            )

    listing = Listing(
        host_id=current_user.id,
        **listing_data,
    )
    db.add(listing)
    await db.flush()
    await db.refresh(listing)

    log.info(
        "listing_created",
        user_id=str(current_user.id),
        listing_id=str(listing.id),
        geocoded=listing.latitude is not None,
    )

    await track_backend_event(
        db,
        event_name="listing_created",
        user_id=current_user.id,
        source="backend",
        properties={
            "listing_id": str(listing.id),
            "city": listing.city,
            "state": listing.state,
        },
    )

    # Update onboarding metadata
    if current_user.onboarding_metadata and "steps" in current_user.onboarding_metadata:
        if not current_user.onboarding_metadata["steps"].get("first_meaningful_action"):
            current_user.onboarding_metadata["steps"]["first_meaningful_action"] = True
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(current_user, "onboarding_metadata")

    return listing


# ─── UH-105: Edit listing ────────────────────────────────────────────────────
@router.patch("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: uuid.UUID,
    data: ListingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update listing details. Only the host can edit."""
    result = await db.execute(
        select(Listing).where(and_(Listing.id == listing_id, Listing.host_id == current_user.id))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found or not owned by you")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)

    await db.flush()
    await db.refresh(listing)
    return listing


# ─── UH-105: Listing status control (pause/close/activate) ───────────────────
@router.patch("/{listing_id}/status", response_model=ListingResponse)
async def update_listing_status(
    listing_id: uuid.UUID,
    data: ListingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change listing status. Only the host can control their listing."""
    result = await db.execute(
        select(Listing).where(and_(Listing.id == listing_id, Listing.host_id == current_user.id))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found or not owned by you")

    listing.status = data.status.value
    await db.flush()

    if listing.status == "active":
        await track_backend_event(
            db,
            event_name="listing_published",
            user_id=current_user.id,
            source="backend",
            properties={
                "listing_id": str(listing.id),
                "city": listing.city,
                "state": listing.state,
            },
        )

    await db.refresh(listing)
    return listing


# ─── UH-103: Host decision on interest ───────────────────────────────────────
@router.patch("/{listing_id}/interests/{interest_id}", response_model=InterestDetailResponse)
async def host_decide_interest(
    listing_id: uuid.UUID,
    interest_id: uuid.UUID,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Host decision: shortlist, accept, reject, or archive an interest."""
    # Verify listing ownership
    listing_result = await db.execute(
        select(Listing).where(and_(Listing.id == listing_id, Listing.host_id == current_user.id))
    )
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found or not owned by you")

    # Fetch interest
    interest_result = await db.execute(
        select(MatchInterest).where(
            and_(MatchInterest.id == interest_id, MatchInterest.to_listing_id == listing_id)
        )
    )
    interest = interest_result.scalar_one_or_none()
    if not interest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interest not found for this listing")

    new_status = data.get("status", "")
    valid_statuses = {"shortlisted", "accepted", "rejected", "archived"}
    if new_status not in valid_statuses:
        log.warning(
            "interest_decision_invalid_status",
            user_id=str(current_user.id),
            listing_id=str(listing_id),
            interest_id=str(interest_id),
            requested_status=new_status,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )

    previous_status = interest.status
    interest.status = new_status

    # If accepted, mark as mutual only when host has an explicit reciprocal interest.
    if new_status == "accepted":
        mutual_check = await db.execute(
            select(MatchInterest).where(
                and_(
                    MatchInterest.from_user_id == current_user.id,
                    MatchInterest.to_user_id == interest.from_user_id,
                    MatchInterest.status.in_(["interested", "shortlisted", "accepted"]),
                )
            )
        )
        if mutual_check.scalar_one_or_none():
            interest.status = "mutual"

    log.info(
        "interest_decision_made",
        host_user_id=str(current_user.id),
        listing_id=str(listing_id),
        interest_id=str(interest_id),
        applicant_user_id=str(interest.from_user_id),
        previous_status=previous_status,
        new_status=interest.status,
        mutual=interest.status == "mutual",
    )

    await db.flush()

    if interest.status == "mutual":
        await track_backend_event(
            db,
            event_name="mutual_match_created",
            user_id=interest.from_user_id,
            source="backend",
            properties={"interest_id": str(interest.id), "listing_id": str(listing.id)},
        )

    await db.refresh(interest)

    # Return with applicant details
    user_result = await db.execute(select(User).where(User.id == interest.from_user_id))
    applicant = user_result.scalar_one_or_none()

    # Notify applicant of host decision / mutual match
    if applicant:
        if interest.status == "mutual":
            await _notifier.notify_mutual_match(
                push_token_a=applicant.push_token,
                email_a=applicant.email,
                prefs_a=applicant.notification_prefs,
                push_token_b=current_user.push_token,
                email_b=current_user.email,
                prefs_b=current_user.notification_prefs,
                listing_title=listing.title,
            )
        elif interest.status in ("accepted", "shortlisted"):
            await _notifier.notify_host_decision(
                applicant_push_token=applicant.push_token,
                applicant_email=applicant.email,
                applicant_prefs=applicant.notification_prefs,
                decision=interest.status,
                listing_title=listing.title,
            )

    return InterestDetailResponse(
        id=interest.id,
        from_user_id=interest.from_user_id,
        to_listing_id=interest.to_listing_id,
        to_user_id=interest.to_user_id,
        compatibility_score=float(interest.compatibility_score) if interest.compatibility_score else None,
        status=interest.status,
        message=interest.message,
        created_at=interest.created_at,
        applicant_name=applicant.full_name if applicant else "Unknown",
        applicant_avatar=applicant.avatar_url if applicant else None,
        applicant_trust_score=float(applicant.trust_score) if applicant else 0,
        applicant_occupation=applicant.occupation if applicant else None,
        applicant_city=applicant.current_city if applicant else None,
        listing_title=listing.title,
    )


# ─── Inquiry / Contact host ──────────────────────────────────────────────────
@router.post("/{listing_id}/inquiries", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
async def create_inquiry(
    listing_id: uuid.UUID,
    data: InquiryCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a contact inquiry to a listing's host.
    sender_user_id must be a valid user id.
    """
    listing_result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    inquiry = ListingInquiry(
        listing_id=listing_id,
        sender_user_id=data.sender_user_id,
        message=data.message,
    )
    db.add(inquiry)
    await db.flush()
    await db.refresh(inquiry)

    log.info(
        "listing_inquiry_created",
        listing_id=str(listing_id),
        sender_user_id=str(data.sender_user_id),
        inquiry_id=str(inquiry.id),
    )
    return inquiry


# ─── Delete listing ──────────────────────────────────────────────────────────
@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Listing).where(and_(Listing.id == listing_id, Listing.host_id == current_user.id))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        log.warning(
            "listing_delete_denied",
            user_id=str(current_user.id),
            listing_id=str(listing_id),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found or not owned by you")

    log.warning(
        "listing_deleted",
        user_id=str(current_user.id),
        listing_id=str(listing_id),
        listing_title=listing.title,
        listing_status=listing.status,
        image_count=len(listing.images or []),
    )
    await db.delete(listing)


# ─── Image upload ─────────────────────────────────────────────────────────────
_MAX_IMAGE_BYTES = 15 * 1024 * 1024  # 15 MB
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
_MAX_IMAGES_PER_LISTING = 10


@router.post("/{listing_id}/images", status_code=status.HTTP_201_CREATED)
async def upload_listing_image(
    listing_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a listing photo. Automatically resizes to thumbnail/medium/full,
    strips EXIF data, converts HEIC to JPEG, and stores all variants on S3.
    The medium key is appended to listing.images. Returns all three S3 keys.
    """
    result = await db.execute(
        select(Listing).where(and_(Listing.id == listing_id, Listing.host_id == current_user.id))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found or not owned by you")

    current_images = listing.images or []
    if len(current_images) >= _MAX_IMAGES_PER_LISTING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Listing already has {_MAX_IMAGES_PER_LISTING} images (maximum)",
        )

    content_type = file.content_type or ""
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Allowed: {', '.join(_ALLOWED_TYPES)}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large ({len(file_bytes) // 1024 // 1024} MB). Maximum is 15 MB.",
        )

    import time as _time
    key_prefix = listing_image_prefix(str(current_user.id), str(listing_id), int(_time.time()))

    log.info(
        "listing_image_upload_started",
        user_id=str(current_user.id),
        listing_id=str(listing_id),
        content_type=content_type,
        file_bytes=len(file_bytes),
        current_image_count=len(current_images),
    )

    try:
        keys = process_and_upload_image(file_bytes, key_prefix)
    except RuntimeError as exc:
        # S3 not configured
        log.error(
            "listing_image_upload_s3_not_configured",
            user_id=str(current_user.id),
            listing_id=str(listing_id),
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image upload is not available: storage is not configured.",
        )
    except OSError as exc:
        log.error(
            "listing_image_processing_failed",
            user_id=str(current_user.id),
            listing_id=str(listing_id),
            content_type=content_type,
            file_bytes=len(file_bytes),
            exc_type=type(exc).__name__,
            error=str(exc),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process image: {exc}",
        )

    listing.images = current_images + [keys["medium"]]
    await db.flush()

    log.info(
        "listing_image_upload_complete",
        user_id=str(current_user.id),
        listing_id=str(listing_id),
        medium_key=keys["medium"],
        total_images=len(listing.images),
    )
    return {
        "thumbnail": keys["thumbnail"],
        "medium": keys["medium"],
        "full": keys["full"],
        "listing_image_count": len(listing.images),
    }


@router.delete("/{listing_id}/images", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing_image(
    listing_id: uuid.UUID,
    s3_key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an image from a listing by its S3 key."""
    result = await db.execute(
        select(Listing).where(and_(Listing.id == listing_id, Listing.host_id == current_user.id))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found or not owned by you")

    current_images = listing.images or []
    if s3_key not in current_images:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image key not found on this listing")

    listing.images = [k for k in current_images if k != s3_key]
    await db.flush()
