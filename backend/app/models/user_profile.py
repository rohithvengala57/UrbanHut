import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserProfile(Base):
    """Lifestyle preferences. One-to-one with User. Created lazily on first profile update."""

    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    bio: Mapped[str | None] = mapped_column(Text)
    occupation: Mapped[str | None] = mapped_column(String(100))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))

    diet_preference: Mapped[str | None] = mapped_column(String(30))
    smoking: Mapped[bool] = mapped_column(Boolean, default=False)
    drinking: Mapped[str] = mapped_column(String(20), default="social")
    pet_friendly: Mapped[bool] = mapped_column(Boolean, default=True)
    sleep_schedule: Mapped[str] = mapped_column(String(20), default="normal")
    noise_tolerance: Mapped[str] = mapped_column(String(20), default="moderate")
    guest_frequency: Mapped[str] = mapped_column(String(20), default="sometimes")
    cleanliness_level: Mapped[int] = mapped_column(Integer, default=3)
    work_schedule: Mapped[str | None] = mapped_column(String(30))

    user: Mapped["User"] = relationship("User", back_populates="profile")
