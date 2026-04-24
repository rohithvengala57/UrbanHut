import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.utils.sanitize import sanitize_text


# ─── Chat ────────────────────────────────────────────────────────────────────
class ChatRoomResponse(BaseModel):
    id: uuid.UUID
    interest_id: uuid.UUID | None = None
    listing_id: uuid.UUID | None = None
    user_a_id: uuid.UUID
    user_b_id: uuid.UUID
    status: str
    created_at: datetime
    # Enriched fields
    other_user_name: str = ""
    other_user_avatar: str | None = None
    other_user_trust: float = 0
    last_message: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0
    listing_title: str | None = None

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)

    @field_validator("body", mode="before")
    @classmethod
    def sanitize_body(cls, v):
        return sanitize_text(v)


class MessageResponse(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    sender_id: uuid.UUID
    body: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Appointments ────────────────────────────────────────────────────────────
class AppointmentCreate(BaseModel):
    appointment_type: str  # "tour" | "call"
    proposed_time: datetime
    alt_time_1: datetime | None = None
    alt_time_2: datetime | None = None
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    status: str  # "accepted" | "rejected" | "rescheduled"
    confirmed_time: datetime | None = None
    notes: str | None = None


class AppointmentResponse(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    proposer_id: uuid.UUID
    responder_id: uuid.UUID
    appointment_type: str
    proposed_time: datetime
    alt_time_1: datetime | None = None
    alt_time_2: datetime | None = None
    confirmed_time: datetime | None = None
    status: str
    notes: str | None = None
    created_at: datetime
    # Enriched
    proposer_name: str = ""
    responder_name: str = ""

    model_config = {"from_attributes": True}
