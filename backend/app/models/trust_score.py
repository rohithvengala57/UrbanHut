import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from app.utils.db_types import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TrustEvent(Base):
    __tablename__ = "trust_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    category: Mapped[str] = mapped_column(String(30), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    points_delta: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    event_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB)
    decayed: Mapped[bool] = mapped_column(Boolean, default=False)
    decay_factor: Mapped[float] = mapped_column(Numeric(3, 2), default=1.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TrustSnapshot(Base):
    __tablename__ = "trust_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    total_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    verification_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    financial_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    household_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    tenure_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    community_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)

    trend: Mapped[str | None] = mapped_column(String(10))

    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
