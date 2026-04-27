import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class InquiryCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    sender_user_id: uuid.UUID


class InquiryResponse(BaseModel):
    id: uuid.UUID
    listing_id: uuid.UUID
    sender_user_id: uuid.UUID
    message: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
