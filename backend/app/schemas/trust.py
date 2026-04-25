import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TrustActivityItem(BaseModel):
    type: str
    points: float


class TrustScoreResponse(BaseModel):
    total_score: float
    verification_score: float
    financial_score: float
    household_score: float
    tenure_score: float
    community_score: float
    trend: str | None = None
    trend_explanation: str | None = None
    calculated_at: datetime
    breakdown: dict | None = None
    recent_activity: list[TrustActivityItem] | None = None
    improvement_suggestions: list[str] | None = None

    model_config = {"from_attributes": True}


class TrustEventResponse(BaseModel):
    id: uuid.UUID
    category: str
    event_type: str
    points_delta: float
    event_metadata: dict | None = Field(default=None, serialization_alias="metadata")
    display_title: str | None = None
    display_description: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VouchCreate(BaseModel):
    relationship: str | None = None
    message: str | None = None


class VouchResponse(BaseModel):
    id: uuid.UUID
    voucher_id: uuid.UUID
    vouchee_id: uuid.UUID
    relationship: str | None = None
    message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
