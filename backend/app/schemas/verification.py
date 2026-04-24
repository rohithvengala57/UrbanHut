import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class VerificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    status: str
    document_url: str | None = None
    submitted_at: datetime | None = None
    verified_at: datetime | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None
    verification_metadata: dict | None = Field(default=None, serialization_alias="metadata")
    points_awarded: int

    model_config = {"from_attributes": True}


class PhoneOTPRequest(BaseModel):
    phone: str = Field(min_length=6, max_length=20)


class PhoneOTPVerify(BaseModel):
    phone: str = Field(min_length=6, max_length=20)
    code: str = Field(min_length=6, max_length=6)


class VerificationDocumentSubmit(BaseModel):
    document_url: str = Field(min_length=3, max_length=1000)
    notes: str | None = Field(default=None, max_length=1000)


class VerificationReviewRequest(BaseModel):
    status: str
    review_notes: str | None = Field(default=None, max_length=1000)
