import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TelemetryEvent(Base):
    """
    Canonical backend event stream for Track 2 funnel analytics.

    We persist event-level first/last-touch attribution snapshots to support:
    - user/household drill-down
    - daily funnel/channel aggregate queries
    """

    __tablename__ = "telemetry_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    household_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="SET NULL"), index=True
    )
    event_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="backend")
    session_id: Mapped[str | None] = mapped_column(String(128), index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    event_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    utm_source: Mapped[str | None] = mapped_column(String(100), index=True)
    utm_medium: Mapped[str | None] = mapped_column(String(100), index=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(200), index=True)
    city: Mapped[str | None] = mapped_column(String(120), index=True)

    properties: Mapped[dict | None] = mapped_column(JSON)
    first_touch: Mapped[dict | None] = mapped_column(JSON)
    last_touch: Mapped[dict | None] = mapped_column(JSON)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserAttribution(Base):
    """
    Durable attribution snapshot per user.

    `first_touch_*` is immutable once set.
    `last_touch_*` updates as new campaign context arrives.
    """

    __tablename__ = "user_attribution"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    first_touch: Mapped[dict | None] = mapped_column(JSON)
    last_touch: Mapped[dict | None] = mapped_column(JSON)

    first_touch_source: Mapped[str | None] = mapped_column(String(100), index=True)
    first_touch_medium: Mapped[str | None] = mapped_column(String(100), index=True)
    first_touch_campaign: Mapped[str | None] = mapped_column(String(200), index=True)
    first_touch_city: Mapped[str | None] = mapped_column(String(120), index=True)

    last_touch_source: Mapped[str | None] = mapped_column(String(100), index=True)
    last_touch_medium: Mapped[str | None] = mapped_column(String(100), index=True)
    last_touch_campaign: Mapped[str | None] = mapped_column(String(200), index=True)
    last_touch_city: Mapped[str | None] = mapped_column(String(120), index=True)

    first_touch_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_touch_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    signup_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    first_activation_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
