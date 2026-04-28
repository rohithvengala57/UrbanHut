import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ServiceBooking(Base):
    __tablename__ = "service_bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_providers.id", ondelete="CASCADE"), nullable=False, index=True
    )

    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    time_slot: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. "09:00", "14:30"
    notes: Mapped[str | None] = mapped_column(Text)

    # "pending" | "confirmed" | "rescheduled" | "cancelled" | "completed"
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    # Populated when status == "rescheduled"
    rescheduled_date: Mapped[date | None] = mapped_column(Date)
    rescheduled_time_slot: Mapped[str | None] = mapped_column(String(20))
    reschedule_reason: Mapped[str | None] = mapped_column(Text)

    cancel_reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
