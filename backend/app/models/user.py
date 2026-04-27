import uuid
from datetime import date, datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    JSON,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Sentinel for "not provided" so property setters can distinguish None from missing
_MISSING = object()


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    avatar_url: Mapped[str | None] = mapped_column(Text)

    role: Mapped[str] = mapped_column(String(20), default="member")
    status: Mapped[str] = mapped_column(String(20), default="active")
    household_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="SET NULL", use_alter=True)
    )

    trust_score: Mapped[float] = mapped_column(Numeric(5, 2), default=15.0)
    trust_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    referral_code: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    referred_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    onboarding_metadata: Mapped[dict | None] = mapped_column(JSON)

    push_token: Mapped[str | None] = mapped_column(Text)
    notification_prefs: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ─── Relationships ────────────────────────────────────────────────────────
    verifications = relationship("Verification", back_populates="user", cascade="all, delete-orphan")
    listings = relationship("Listing", back_populates="host")

    profile: Mapped["UserProfile"] = relationship(  # type: ignore[name-defined]
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    search_prefs: Mapped["UserSearchPreferences"] = relationship(  # type: ignore[name-defined]
        "UserSearchPreferences",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # ─── Transparent property proxies ────────────────────────────────────────
    # These delegate to the split sub-tables so all existing code (matching engine,
    # routers, schemas) continues to work without any changes.

    def _ensure_profile(self):
        if self.profile is None:
            from app.models.user_profile import UserProfile
            self.profile = UserProfile(user_id=self.id)

    def _ensure_search_prefs(self):
        if self.search_prefs is None:
            from app.models.user_search_preferences import UserSearchPreferences
            self.search_prefs = UserSearchPreferences(user_id=self.id)

    # --- UserProfile fields ---

    @property
    def bio(self) -> str | None:
        return self.profile.bio if self.profile else None

    @bio.setter
    def bio(self, v):
        self._ensure_profile()
        self.profile.bio = v

    @property
    def occupation(self) -> str | None:
        return self.profile.occupation if self.profile else None

    @occupation.setter
    def occupation(self, v):
        self._ensure_profile()
        self.profile.occupation = v

    @property
    def date_of_birth(self) -> date | None:
        return self.profile.date_of_birth if self.profile else None

    @date_of_birth.setter
    def date_of_birth(self, v):
        self._ensure_profile()
        self.profile.date_of_birth = v

    @property
    def gender(self) -> str | None:
        return self.profile.gender if self.profile else None

    @gender.setter
    def gender(self, v):
        self._ensure_profile()
        self.profile.gender = v

    @property
    def diet_preference(self) -> str | None:
        return self.profile.diet_preference if self.profile else None

    @diet_preference.setter
    def diet_preference(self, v):
        self._ensure_profile()
        self.profile.diet_preference = v

    @property
    def smoking(self) -> bool:
        return self.profile.smoking if self.profile else False

    @smoking.setter
    def smoking(self, v):
        self._ensure_profile()
        self.profile.smoking = v

    @property
    def drinking(self) -> str:
        return self.profile.drinking if self.profile else "social"

    @drinking.setter
    def drinking(self, v):
        self._ensure_profile()
        self.profile.drinking = v

    @property
    def pet_friendly(self) -> bool:
        return self.profile.pet_friendly if self.profile else True

    @pet_friendly.setter
    def pet_friendly(self, v):
        self._ensure_profile()
        self.profile.pet_friendly = v

    @property
    def sleep_schedule(self) -> str:
        return self.profile.sleep_schedule if self.profile else "normal"

    @sleep_schedule.setter
    def sleep_schedule(self, v):
        self._ensure_profile()
        self.profile.sleep_schedule = v

    @property
    def noise_tolerance(self) -> str:
        return self.profile.noise_tolerance if self.profile else "moderate"

    @noise_tolerance.setter
    def noise_tolerance(self, v):
        self._ensure_profile()
        self.profile.noise_tolerance = v

    @property
    def guest_frequency(self) -> str:
        return self.profile.guest_frequency if self.profile else "sometimes"

    @guest_frequency.setter
    def guest_frequency(self, v):
        self._ensure_profile()
        self.profile.guest_frequency = v

    @property
    def cleanliness_level(self) -> int:
        return self.profile.cleanliness_level if self.profile else 3

    @cleanliness_level.setter
    def cleanliness_level(self, v):
        self._ensure_profile()
        self.profile.cleanliness_level = v

    @property
    def work_schedule(self) -> str | None:
        return self.profile.work_schedule if self.profile else None

    @work_schedule.setter
    def work_schedule(self, v):
        self._ensure_profile()
        self.profile.work_schedule = v

    # --- UserSearchPreferences fields ---

    @property
    def current_city(self) -> str | None:
        return self.search_prefs.current_city if self.search_prefs else None

    @current_city.setter
    def current_city(self, v):
        self._ensure_search_prefs()
        self.search_prefs.current_city = v

    @property
    def current_state(self) -> str | None:
        return self.search_prefs.current_state if self.search_prefs else None

    @current_state.setter
    def current_state(self, v):
        self._ensure_search_prefs()
        self.search_prefs.current_state = v

    @property
    def looking_in(self) -> list[str] | None:
        return self.search_prefs.looking_in if self.search_prefs else None

    @looking_in.setter
    def looking_in(self, v):
        self._ensure_search_prefs()
        self.search_prefs.looking_in = v

    @property
    def budget_min(self) -> int | None:
        return self.search_prefs.budget_min if self.search_prefs else None

    @budget_min.setter
    def budget_min(self, v):
        self._ensure_search_prefs()
        self.search_prefs.budget_min = v

    @property
    def budget_max(self) -> int | None:
        return self.search_prefs.budget_max if self.search_prefs else None

    @budget_max.setter
    def budget_max(self, v):
        self._ensure_search_prefs()
        self.search_prefs.budget_max = v

    @property
    def move_in_date(self) -> date | None:
        return self.search_prefs.move_in_date if self.search_prefs else None

    @move_in_date.setter
    def move_in_date(self, v):
        self._ensure_search_prefs()
        self.search_prefs.move_in_date = v
