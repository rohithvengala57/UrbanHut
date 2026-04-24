import uuid
from datetime import datetime

from pydantic import BaseModel


# ─── Saved Listings ──────────────────────────────────────────────────────────
class SavedListingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    listing_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class SavedListingToggle(BaseModel):
    listing_id: uuid.UUID


class ListingCompareItem(BaseModel):
    id: uuid.UUID
    title: str
    city: str
    state: str
    rent_monthly: int
    security_deposit: int | None = None
    utilities_included: bool
    utility_estimate: int | None = None
    total_bedrooms: int
    total_bathrooms: float
    available_spots: int
    current_occupants: int
    room_type: str
    amenities: list = []
    nearest_transit: str | None = None
    transit_walk_mins: int | None = None
    images: list[str] = []
    host_trust_score: float = 0
    avg_household_trust: float = 0


# ─── Saved Searches ─────────────────────────────────────────────────────────
class SavedSearchCreate(BaseModel):
    name: str
    filters: dict
    alerts_enabled: bool = True


class SavedSearchUpdate(BaseModel):
    name: str | None = None
    alerts_enabled: bool | None = None


class SavedSearchResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    filters: dict
    alerts_enabled: bool
    last_notified_count: int
    new_matches: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
