import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.listing import Listing
from app.models.saved_listing import SavedListing
from app.models.saved_search import SavedSearch
from app.models.user import User
from app.schemas.saved import (
    ListingCompareItem,
    SavedListingResponse,
    SavedSearchCreate,
    SavedSearchResponse,
    SavedSearchUpdate,
)
from app.services.analytics import track_backend_event

router = APIRouter()


# ─── UH-204: Saved Listings ──────────────────────────────────────────────────

@router.get("/listings", response_model=list[SavedListingResponse])
async def get_saved_listings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all saved listings for current user."""
    result = await db.execute(
        select(SavedListing)
        .where(SavedListing.user_id == current_user.id)
        .order_by(SavedListing.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/listings/ids")
async def get_saved_listing_ids(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Quick lookup of saved listing IDs for toggle state."""
    result = await db.execute(
        select(SavedListing.listing_id).where(SavedListing.user_id == current_user.id)
    )
    return [str(row[0]) for row in result.all()]


@router.post("/listings/compare", response_model=list[ListingCompareItem])
async def compare_listings(
    listing_ids: list[uuid.UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compare up to 4 listings side by side."""
    if len(listing_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 listings to compare")
    if len(listing_ids) > 4:
        raise HTTPException(status_code=400, detail="Can compare at most 4 listings")

    result = await db.execute(select(Listing).where(Listing.id.in_(listing_ids)))
    listings = list(result.scalars().all())

    if len(listings) < 2:
        raise HTTPException(status_code=404, detail="One or more listings not found")

    # Fetch host trust scores
    host_ids = [l.host_id for l in listings]
    hosts_result = await db.execute(select(User).where(User.id.in_(host_ids)))
    hosts_map = {u.id: u for u in hosts_result.scalars().all()}

    # Fetch household avg trust per listing
    from app.models.household import Household

    items = []
    for listing in listings:
        host = hosts_map.get(listing.host_id)
        host_trust = float(host.trust_score) if host else 0

        # Avg household trust
        hh_result = await db.execute(select(Household).where(Household.listing_id == listing.id))
        hh = hh_result.scalar_one_or_none()
        avg_hh_trust = 0.0
        if hh:
            members_result = await db.execute(
                select(func.avg(User.trust_score)).where(User.household_id == hh.id)
            )
            avg_val = members_result.scalar()
            avg_hh_trust = float(avg_val) if avg_val else 0.0

        items.append(ListingCompareItem(
            id=listing.id,
            title=listing.title,
            city=listing.city,
            state=listing.state,
            rent_monthly=listing.rent_monthly,
            security_deposit=listing.security_deposit,
            utilities_included=listing.utilities_included,
            utility_estimate=listing.utility_estimate,
            total_bedrooms=listing.total_bedrooms,
            total_bathrooms=float(listing.total_bathrooms),
            available_spots=listing.available_spots,
            current_occupants=listing.current_occupants,
            room_type=listing.room_type,
            amenities=listing.amenities or [],
            nearest_transit=listing.nearest_transit,
            transit_walk_mins=listing.transit_walk_mins,
            images=listing.images or [],
            host_trust_score=host_trust,
            avg_household_trust=round(avg_hh_trust, 1),
        ))

    return items


@router.post("/listings/{listing_id}", response_model=SavedListingResponse, status_code=201)
async def save_listing(
    listing_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a listing. Idempotent — re-saving returns existing."""
    existing = await db.execute(
        select(SavedListing).where(
            and_(SavedListing.user_id == current_user.id, SavedListing.listing_id == listing_id)
        )
    )
    if found := existing.scalar_one_or_none():
        return found

    # Verify listing exists
    listing_check = await db.execute(select(Listing.id).where(Listing.id == listing_id))
    if not listing_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Listing not found")

    saved = SavedListing(user_id=current_user.id, listing_id=listing_id)
    db.add(saved)
    await track_backend_event(
        db,
        event_name="saved_listing_added",
        user_id=current_user.id,
        properties={"listing_id": str(listing_id)},
    )
    await db.flush()
    await db.refresh(saved)
    return saved


@router.delete("/listings/{listing_id}", status_code=204)
async def unsave_listing(
    listing_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unsave a listing."""
    result = await db.execute(
        select(SavedListing).where(
            and_(SavedListing.user_id == current_user.id, SavedListing.listing_id == listing_id)
        )
    )
    saved = result.scalar_one_or_none()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved listing not found")
    await db.delete(saved)


# ─── UH-205: Saved Searches ──────────────────────────────────────────────────

@router.post("/searches", response_model=SavedSearchResponse, status_code=201)
async def create_saved_search(
    data: SavedSearchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a search with filters."""
    # Count existing matching listings so we can detect new ones later
    count = await _count_matching_listings(data.filters, db)

    search = SavedSearch(
        user_id=current_user.id,
        name=data.name,
        filters=data.filters,
        alerts_enabled=data.alerts_enabled,
        last_notified_count=count,
    )
    db.add(search)
    await db.flush()
    await db.refresh(search)

    resp = SavedSearchResponse.model_validate(search)
    resp.new_matches = 0
    return resp


@router.get("/searches", response_model=list[SavedSearchResponse])
async def get_saved_searches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all saved searches with new match counts."""
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at.desc())
    )
    searches = list(result.scalars().all())

    responses = []
    for s in searches:
        current_count = await _count_matching_listings(s.filters, db)
        new_matches = max(0, current_count - s.last_notified_count)
        resp = SavedSearchResponse.model_validate(s)
        resp.new_matches = new_matches
        responses.append(resp)

    return responses


@router.patch("/searches/{search_id}", response_model=SavedSearchResponse)
async def update_saved_search(
    search_id: uuid.UUID,
    data: SavedSearchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle alerts or rename a saved search."""
    result = await db.execute(
        select(SavedSearch).where(
            and_(SavedSearch.id == search_id, SavedSearch.user_id == current_user.id)
        )
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")

    if data.name is not None:
        search.name = data.name
    if data.alerts_enabled is not None:
        search.alerts_enabled = data.alerts_enabled

    await db.flush()
    await db.refresh(search)

    current_count = await _count_matching_listings(search.filters, db)
    resp = SavedSearchResponse.model_validate(search)
    resp.new_matches = max(0, current_count - search.last_notified_count)
    return resp


@router.delete("/searches/{search_id}", status_code=204)
async def delete_saved_search(
    search_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(
            and_(SavedSearch.id == search_id, SavedSearch.user_id == current_user.id)
        )
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    await db.delete(search)


async def _count_matching_listings(filters: dict, db: AsyncSession) -> int:
    """Count active listings matching a filter dict."""
    query = select(func.count(Listing.id)).where(Listing.status == "active")

    if filters.get("city"):
        query = query.where(Listing.city.ilike(f"%{filters['city']}%"))
    if filters.get("price_min") is not None:
        query = query.where(Listing.rent_monthly >= filters["price_min"])
    if filters.get("price_max") is not None:
        query = query.where(Listing.rent_monthly <= filters["price_max"])
    if filters.get("room_type"):
        query = query.where(Listing.room_type == filters["room_type"])
    if filters.get("property_type"):
        query = query.where(Listing.property_type == filters["property_type"])

    result = await db.execute(query)
    return result.scalar() or 0
