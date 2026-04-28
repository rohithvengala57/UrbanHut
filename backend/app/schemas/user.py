import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.verification import VerificationResponse
from app.utils.sanitize import sanitize_text


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    referral_code: str | None = Field(None, max_length=20)
    utm_source: str | None = Field(None, max_length=100)
    utm_medium: str | None = Field(None, max_length=100)
    utm_campaign: str | None = Field(None, max_length=200)
    utm_term: str | None = Field(None, max_length=100)
    utm_content: str | None = Field(None, max_length=100)
    utm_city: str | None = Field(None, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    bio: str | None = Field(None, max_length=1000)
    date_of_birth: date | None = None
    gender: str | None = None
    occupation: str | None = Field(None, max_length=100)

    @field_validator("bio", "full_name", "occupation", mode="before")
    @classmethod
    def sanitize_text_fields(cls, v):
        return sanitize_text(v)
    diet_preference: str | None = None
    smoking: bool | None = None
    drinking: str | None = None
    pet_friendly: bool | None = None
    sleep_schedule: str | None = None
    noise_tolerance: str | None = None
    guest_frequency: str | None = None
    cleanliness_level: int | None = Field(None, ge=1, le=5)
    work_schedule: str | None = None
    current_city: str | None = None
    current_state: str | None = None
    looking_in: list[str] | None = None
    budget_min: int | None = None
    budget_max: int | None = None
    move_in_date: date | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    occupation: str | None = None
    diet_preference: str | None = None
    smoking: bool
    drinking: str
    pet_friendly: bool
    sleep_schedule: str
    noise_tolerance: str
    guest_frequency: str
    cleanliness_level: int
    work_schedule: str | None = None
    current_city: str | None = None
    current_state: str | None = None
    looking_in: list[str] | None = None
    budget_min: int | None = None
    budget_max: int | None = None
    move_in_date: date | None = None
    role: str
    status: str
    household_id: uuid.UUID | None = None
    trust_score: float
    referral_code: str | None = None
    onboarding_metadata: dict | None = None
    # Cold-start UX: show "New Member" badge for users with low behavioral data.
    # Frontend should display this instead of the raw score when is_new_member=True.
    is_new_member: bool = False
    trust_label: str = ""
    created_at: datetime
    verifications: list[VerificationResponse] = []

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user, verifications=None):
        from datetime import timezone
        now = datetime.now(timezone.utc)
        created = user.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        days_old = (now - created).days
        is_new = days_old < 30
        score = float(user.trust_score)
        if is_new:
            label = "New to Urban Hut · Verified" if score >= 19 else "New to Urban Hut"
        elif score >= 75:
            label = "Highly Trusted"
        elif score >= 50:
            label = "Trusted"
        elif score >= 30:
            label = "Building Trust"
        else:
            label = "Getting Started"

        data = {
            **{k: getattr(user, k, None) for k in cls.model_fields if k not in ("is_new_member", "trust_label", "verifications")},
            "is_new_member": is_new,
            "trust_label": label,
            "verifications": verifications or [],
        }
        return cls(**data)


class UserPublicResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    avatar_url: str | None = None
    bio: str | None = None
    gender: str | None = None
    occupation: str | None = None
    diet_preference: str | None = None
    smoking: bool
    drinking: str
    pet_friendly: bool
    sleep_schedule: str
    noise_tolerance: str
    guest_frequency: str
    cleanliness_level: int
    work_schedule: str | None = None
    current_city: str | None = None
    trust_score: float
    created_at: datetime

    model_config = {"from_attributes": True}
