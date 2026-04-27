import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Property details
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    property_type: Mapped[str] = mapped_column(String(30), nullable=False)
    room_type: Mapped[str] = mapped_column(String(30), nullable=False)

    # Address
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(10), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7))
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7))

    # Financial
    rent_monthly: Mapped[int] = mapped_column(Integer, nullable=False)
    security_deposit: Mapped[int | None] = mapped_column(Integer)
    utilities_included: Mapped[bool] = mapped_column(Boolean, default=False)
    utility_estimate: Mapped[int | None] = mapped_column(Integer)

    # Room details
    total_bedrooms: Mapped[int] = mapped_column(Integer, nullable=False)
    total_bathrooms: Mapped[float] = mapped_column(Numeric(3, 1), nullable=False)
    available_spots: Mapped[int] = mapped_column(Integer, default=1)
    current_occupants: Mapped[int] = mapped_column(Integer, default=0)

    # Amenities & rules
    amenities: Mapped[dict] = mapped_column(JSON, default=list)
    house_rules: Mapped[dict] = mapped_column(JSON, default=list)

    # Media
    images: Mapped[list[str]] = mapped_column(JSON, default=list)

    # Availability
    available_from: Mapped[date] = mapped_column(Date, nullable=False)
    available_until: Mapped[date | None] = mapped_column(Date)
    lease_duration: Mapped[str | None] = mapped_column(String(30))

    # Transit
    nearest_transit: Mapped[str | None] = mapped_column(String(200))
    transit_walk_mins: Mapped[int | None] = mapped_column(Integer)
    nearby_universities: Mapped[list[str] | None] = mapped_column(JSON)

    # Verification
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Status
    status: Mapped[str] = mapped_column(String(20), default="active")
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    host = relationship("User", back_populates="listings", foreign_keys=[host_id])
