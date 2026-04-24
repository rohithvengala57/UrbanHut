import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


# ── Chore Templates ────────────────────────────────────────────────────────

class ChoreTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    category: str | None = None
    weight: float = Field(default=1.0, ge=0.1, le=10.0)
    frequency: int = Field(default=7, ge=1, le=7)
    time_of_day: str = "anytime"


class ChoreTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    weight: float | None = None
    frequency: int | None = None
    time_of_day: str | None = None
    is_active: bool | None = None


class ChoreTemplateResponse(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    description: str | None = None
    category: str | None = None
    weight: float
    frequency: int
    time_of_day: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Chore Constraints ──────────────────────────────────────────────────────

class ChoreConstraintCreate(BaseModel):
    user_id: uuid.UUID | None = None
    chore_id: uuid.UUID | None = None
    type: str
    day_of_week: int | None = Field(None, ge=0, le=6)
    max_frequency: int | None = None
    priority: int = 1


class ChoreConstraintResponse(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    user_id: uuid.UUID | None = None
    chore_id: uuid.UUID | None = None
    type: str
    day_of_week: int | None = None
    max_frequency: int | None = None
    priority: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Chore Assignments ──────────────────────────────────────────────────────

class CompleteChoreRequest(BaseModel):
    """Body for completing a chore. All fields are optional."""
    note: str | None = None
    # If the caller is admin, they can specify who actually completed it
    completed_by: uuid.UUID | None = None


class OverrideAssignmentRequest(BaseModel):
    """Admin: reassign a slot to a different member."""
    new_user_id: uuid.UUID


class ChoreAssignmentResponse(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    chore_id: uuid.UUID
    assigned_to: uuid.UUID
    day_of_week: int
    week_start: date
    status: str
    completed_at: datetime | None = None
    completed_by: uuid.UUID | None = None
    note: str | None = None
    admin_verified: bool
    points_earned: float

    model_config = {"from_attributes": True}


# ── Schedule ───────────────────────────────────────────────────────────────

class ScheduleGenerateRequest(BaseModel):
    week_start: date


# ── Points / Performance ───────────────────────────────────────────────────

class PointsSummary(BaseModel):
    user_id: uuid.UUID
    full_name: str
    total_points: float


class PerformanceSummary(BaseModel):
    """Per-member chore performance for a given week range."""
    user_id: uuid.UUID
    full_name: str
    assigned: int
    completed: int
    missed: int
    completion_rate: float  # 0.0 – 1.0
    total_points: float
