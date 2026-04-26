import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class InterestStatus(str, Enum):
    interested = "interested"
    shortlisted = "shortlisted"
    accepted = "accepted"
    rejected = "rejected"
    archived = "archived"
    mutual = "mutual"


class InterestCreate(BaseModel):
    to_listing_id: uuid.UUID | None = None
    to_user_id: uuid.UUID | None = None
    message: str | None = None


class InterestUpdate(BaseModel):
    status: InterestStatus


class HostDecisionUpdate(BaseModel):
    status: InterestStatus

    def validate_host_status(self) -> bool:
        return self.status in {
            InterestStatus.shortlisted,
            InterestStatus.accepted,
            InterestStatus.rejected,
            InterestStatus.archived,
        }


class InterestResponse(BaseModel):
    id: uuid.UUID
    from_user_id: uuid.UUID
    to_listing_id: uuid.UUID | None = None
    to_user_id: uuid.UUID | None = None
    compatibility_score: float | None = None
    status: str
    message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InterestDetailResponse(InterestResponse):
    """Interest with full applicant details for the host inbox."""
    applicant_name: str = ""
    applicant_avatar: str | None = None
    applicant_trust_score: float = 0
    applicant_occupation: str | None = None
    applicant_city: str | None = None
    listing_title: str | None = None
    match_percentage: int | None = None
    match_reasons: list[str] | None = None


class CompatibilityResponse(BaseModel):
    total_score: float
    lifestyle_score: float
    budget_score: float
    trust_score: float
    breakdown: dict
