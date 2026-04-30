import uuid
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator

from app.utils.sanitize import sanitize_text


class ListingStatus(str, Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    closed = "closed"


class ListingCreate(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=5000)

    @field_validator("title", "description", mode="before")
    @classmethod
    def sanitize_text_fields(cls, v):
        return sanitize_text(v)
    property_type: str
    room_type: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    zip_code: str
    latitude: float | None = None
    longitude: float | None = None
    rent_monthly: int = Field(gt=0)
    security_deposit: int | None = None
    utilities_included: bool = False
    utility_estimate: int | None = None
    total_bedrooms: int = Field(gt=0)
    total_bathrooms: float = Field(gt=0)
    available_spots: int = Field(default=1, gt=0)
    current_occupants: int = Field(default=0, ge=0)
    amenities: list[str] = []
    house_rules: list[str] = []
    available_from: date
    available_until: date | None = None
    lease_duration: str | None = None
    nearest_transit: str | None = None
    transit_walk_mins: int | None = None
    nearby_universities: list[str] | None = None
    status: ListingStatus = ListingStatus.active


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    nearby_universities: list[str] | None = None
    rent_monthly: int | None = None
    security_deposit: int | None = None
    utilities_included: bool | None = None
    utility_estimate: int | None = None
    available_spots: int | None = None
    current_occupants: int | None = None
    amenities: list[str] | None = None
    house_rules: list[str] | None = None
    available_from: date | None = None
    available_until: date | None = None
    lease_duration: str | None = None
    nearest_transit: str | None = None
    transit_walk_mins: int | None = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def sanitize_optional_text_fields(cls, v):
        if v is None:
            return v
        return sanitize_text(v)


class ListingStatusUpdate(BaseModel):
    status: ListingStatus


class RoommateCard(BaseModel):
    name: str
    trust_score: float
    traits: list[str]


class ListingResponse(BaseModel):
    id: uuid.UUID
    host_id: uuid.UUID
    title: str
    description: str
    property_type: str
    room_type: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    zip_code: str
    latitude: float | None = None
    longitude: float | None = None
    rent_monthly: int
    security_deposit: int | None = None
    utilities_included: bool
    utility_estimate: int | None = None
    total_bedrooms: int
    total_bathrooms: float
    available_spots: int
    current_occupants: int
    amenities: list
    house_rules: list
    images: list[str]
    available_from: date
    available_until: date | None = None
    lease_duration: str | None = None
    nearest_transit: str | None = None
    transit_walk_mins: int | None = None
    nearby_universities: list[str] | None = None
    is_verified: bool
    status: str
    view_count: int
    created_at: datetime
    updated_at: datetime
    avg_roommate_trust: float | None = None
    roommates: list[RoommateCard] | None = None

    model_config = {"from_attributes": True}


class MyListingResponse(ListingResponse):
    """Extended listing response for host dashboard with interest counts."""
    interest_count: int = 0
    new_interest_count: int = 0
    shortlist_count: int = 0
    accept_count: int = 0


class FunnelStep(BaseModel):
    label: str
    count: int
    percentage: float


class ListingMetricsResponse(BaseModel):
    listing_id: uuid.UUID
    view_count: int = 0
    interest_count: int = 0
    shortlist_count: int = 0
    accept_count: int = 0
    reject_count: int = 0
    archive_count: int = 0
    funnel: list[FunnelStep] = []


class ListingSearchParams(BaseModel):
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    price_min: int | None = None
    price_max: int | None = None
    room_type: str | None = None
    property_type: str | None = None
    available_from: date | None = None
    sort_by: str = "created_at"
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
