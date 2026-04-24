import uuid
from datetime import date

from sqlalchemy import ARRAY, Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserSearchPreferences(Base):
    """Room search parameters. One-to-one with User. Created lazily on first update."""

    __tablename__ = "user_search_preferences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    current_city: Mapped[str | None] = mapped_column(String(100), index=True)
    current_state: Mapped[str | None] = mapped_column(String(50))
    looking_in: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    budget_min: Mapped[int | None] = mapped_column(Integer)
    budget_max: Mapped[int | None] = mapped_column(Integer)
    move_in_date: Mapped[date | None] = mapped_column(Date)

    user: Mapped["User"] = relationship("User", back_populates="search_prefs")
