import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class HouseholdCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    listing_id: uuid.UUID | None = None
    max_members: int = Field(default=6, ge=2, le=20)


class HouseholdResponse(BaseModel):
    id: uuid.UUID
    name: str
    listing_id: uuid.UUID | None = None
    admin_id: uuid.UUID
    invite_code: str | None = None
    max_members: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class HouseholdJoin(BaseModel):
    invite_code: str
