import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.chore import ChoreAssignment, ChoreConstraint, ChoreTemplate
from app.models.household import Household
from app.models.user import User
from app.schemas.chore import (
    ChoreAssignmentResponse,
    ChoreConstraintCreate,
    ChoreConstraintResponse,
    ChoreTemplateCreate,
    ChoreTemplateResponse,
    ChoreTemplateUpdate,
    CompleteChoreRequest,
    OverrideAssignmentRequest,
    PerformanceSummary,
    PointsSummary,
    ScheduleGenerateRequest,
)
from app.services.chore_scheduler import ChoreScheduler, ScheduleImpossibleError

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────

def _monday(d: date) -> date:
    """Return the Monday of the week containing *d*."""
    return d - timedelta(days=d.weekday())


async def _require_household(user: User) -> uuid.UUID:
    if not user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")
    return user.household_id


async def _require_admin(user: User, db: AsyncSession) -> Household:
    hh_id = await _require_household(user)
    result = await db.execute(select(Household).where(Household.id == hh_id))
    household = result.scalar_one_or_none()
    if not household or household.admin_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return household


# ── Chore Templates ────────────────────────────────────────────────────────

@router.get("/tasks", response_model=list[ChoreTemplateResponse])
async def list_chore_templates(
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    q = select(ChoreTemplate).where(ChoreTemplate.household_id == hh_id)
    if not include_inactive:
        q = q.where(ChoreTemplate.is_active.is_(True))
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("/tasks", response_model=ChoreTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_chore_template(
    data: ChoreTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    template = ChoreTemplate(household_id=hh_id, **data.model_dump())
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


@router.patch("/tasks/{task_id}", response_model=ChoreTemplateResponse)
async def update_chore_template(
    task_id: uuid.UUID,
    data: ChoreTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    result = await db.execute(
        select(ChoreTemplate).where(
            and_(ChoreTemplate.id == task_id, ChoreTemplate.household_id == hh_id)
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chore template not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    await db.flush()
    await db.refresh(template)
    return template


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chore_template(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    result = await db.execute(
        select(ChoreTemplate).where(
            and_(ChoreTemplate.id == task_id, ChoreTemplate.household_id == hh_id)
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chore template not found")
    await db.delete(template)


# ── Constraints ────────────────────────────────────────────────────────────

@router.get("/constraints", response_model=list[ChoreConstraintResponse])
async def list_constraints(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    result = await db.execute(
        select(ChoreConstraint).where(ChoreConstraint.household_id == hh_id)
    )
    return list(result.scalars().all())


@router.post("/constraints", response_model=ChoreConstraintResponse, status_code=status.HTTP_201_CREATED)
async def create_constraint(
    data: ChoreConstraintCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    constraint = ChoreConstraint(household_id=hh_id, **data.model_dump())
    db.add(constraint)
    await db.flush()
    await db.refresh(constraint)
    return constraint


@router.patch("/constraints/{constraint_id}/approve", response_model=ChoreConstraintResponse)
async def approve_constraint(
    constraint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin only — approve a pending constraint so the scheduler will use it."""
    await _require_admin(current_user, db)
    result = await db.execute(
        select(ChoreConstraint).where(
            and_(
                ChoreConstraint.id == constraint_id,
                ChoreConstraint.household_id == current_user.household_id,
            )
        )
    )
    constraint = result.scalar_one_or_none()
    if not constraint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Constraint not found")
    constraint.status = "approved"
    await db.flush()
    await db.refresh(constraint)
    return constraint


@router.patch("/constraints/{constraint_id}/reject", response_model=ChoreConstraintResponse)
async def reject_constraint(
    constraint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin only — reject a constraint request."""
    await _require_admin(current_user, db)
    result = await db.execute(
        select(ChoreConstraint).where(
            and_(
                ChoreConstraint.id == constraint_id,
                ChoreConstraint.household_id == current_user.household_id,
            )
        )
    )
    constraint = result.scalar_one_or_none()
    if not constraint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Constraint not found")
    constraint.status = "rejected"
    await db.flush()
    await db.refresh(constraint)
    return constraint


@router.delete("/constraints/{constraint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_constraint(
    constraint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    result = await db.execute(
        select(ChoreConstraint).where(
            and_(ChoreConstraint.id == constraint_id, ChoreConstraint.household_id == hh_id)
        )
    )
    constraint = result.scalar_one_or_none()
    if not constraint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Constraint not found")
    await db.delete(constraint)


# ── Schedule Generation ────────────────────────────────────────────────────

@router.post("/generate", response_model=list[ChoreAssignmentResponse])
async def generate_schedule(
    data: ScheduleGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin only — generate (or regenerate) the weekly schedule.

    Any existing *pending* assignments for that week are cleared first so a
    regeneration is idempotent. Completed assignments are preserved.
    """
    await _require_admin(current_user, db)
    hh_id = current_user.household_id

    # Clear only pending assignments for this week (keep completed ones)
    await db.execute(
        delete(ChoreAssignment).where(
            and_(
                ChoreAssignment.household_id == hh_id,
                ChoreAssignment.week_start == data.week_start,
                ChoreAssignment.status == "pending",
            )
        )
    )

    # Members
    members_result = await db.execute(select(User).where(User.household_id == hh_id))
    members = [m.id for m in members_result.scalars().all()]

    # Active chore templates only
    chores_result = await db.execute(
        select(ChoreTemplate).where(
            and_(ChoreTemplate.household_id == hh_id, ChoreTemplate.is_active.is_(True))
        )
    )
    chores = list(chores_result.scalars().all())

    # Approved constraints only
    constraints_result = await db.execute(
        select(ChoreConstraint).where(
            and_(
                ChoreConstraint.household_id == hh_id,
                ChoreConstraint.status == "approved",
            )
        )
    )
    constraints = list(constraints_result.scalars().all())

    try:
        scheduler = ChoreScheduler()
        result = scheduler.generate_schedule(members, chores, constraints, data.week_start)
    except ScheduleImpossibleError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    assignments = []
    for (day, chore_id), member_id in result.assignments.items():
        chore = next((c for c in chores if c.id == chore_id), None)
        assignment = ChoreAssignment(
            household_id=hh_id,
            chore_id=chore_id,
            assigned_to=member_id,
            day_of_week=day,
            week_start=data.week_start,
            points_earned=float(chore.weight) if chore else 1.0,
        )
        db.add(assignment)
        assignments.append(assignment)

    await db.flush()
    for a in assignments:
        await db.refresh(a)

    return assignments


# ── Schedule View ──────────────────────────────────────────────────────────

@router.get("/schedule", response_model=list[ChoreAssignmentResponse])
async def get_current_schedule(
    week_start: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    ws = week_start if week_start else _monday(date.today())

    result = await db.execute(
        select(ChoreAssignment).where(
            and_(
                ChoreAssignment.household_id == hh_id,
                ChoreAssignment.week_start == ws,
            )
        )
    )
    assignments = list(result.scalars().all())

    # Auto-mark past-due pending assignments as "missed"
    today = date.today()
    for a in assignments:
        if a.status == "pending":
            due_date = ws + timedelta(days=a.day_of_week)
            if due_date < today:
                a.status = "missed"

    await db.flush()
    return assignments


@router.get("/history", response_model=list[ChoreAssignmentResponse])
async def get_history(
    weeks: int = Query(4, ge=1, le=26),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return assignments for the past *weeks* weeks (default 4)."""
    hh_id = await _require_household(current_user)
    today = date.today()
    earliest = _monday(today) - timedelta(weeks=weeks)

    result = await db.execute(
        select(ChoreAssignment).where(
            and_(
                ChoreAssignment.household_id == hh_id,
                ChoreAssignment.week_start >= earliest,
            )
        ).order_by(ChoreAssignment.week_start.desc(), ChoreAssignment.day_of_week)
    )
    return list(result.scalars().all())


# ── Complete / Override ────────────────────────────────────────────────────

@router.post("/schedule/{assignment_id}/complete", response_model=ChoreAssignmentResponse)
async def complete_chore(
    assignment_id: uuid.UUID,
    body: CompleteChoreRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a chore complete.

    - Regular members can only mark their own assigned chores.
    - Admins can mark any chore complete and optionally specify *completed_by*
      (useful when verifying a member finished a task offline).
    """
    hh_id = await _require_household(current_user)

    result = await db.execute(
        select(ChoreAssignment).where(
            and_(
                ChoreAssignment.id == assignment_id,
                ChoreAssignment.household_id == hh_id,
            )
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    # Check household admin status
    hh_result = await db.execute(select(Household).where(Household.id == hh_id))
    household = hh_result.scalar_one_or_none()
    is_admin = household and household.admin_id == current_user.id

    if not is_admin and assignment.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only complete chores assigned to you",
        )

    assignment.status = "completed"
    assignment.completed_at = datetime.now(timezone.utc)

    if body:
        if body.note:
            assignment.note = body.note
        if body.completed_by and is_admin:
            assignment.completed_by = body.completed_by
            assignment.admin_verified = True
        else:
            assignment.completed_by = current_user.id

    if not assignment.completed_by:
        assignment.completed_by = current_user.id

    # Persist points based on chore weight
    chore_result = await db.execute(
        select(ChoreTemplate).where(ChoreTemplate.id == assignment.chore_id)
    )
    chore = chore_result.scalar_one_or_none()
    if chore:
        assignment.points_earned = float(chore.weight)

    await db.flush()
    await db.refresh(assignment)
    return assignment


@router.patch("/schedule/{assignment_id}/override", response_model=ChoreAssignmentResponse)
async def override_assignment(
    assignment_id: uuid.UUID,
    body: OverrideAssignmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin only — reassign a slot to a different household member."""
    household = await _require_admin(current_user, db)

    result = await db.execute(
        select(ChoreAssignment).where(
            and_(
                ChoreAssignment.id == assignment_id,
                ChoreAssignment.household_id == household.id,
            )
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    # Verify new user is a household member
    member_result = await db.execute(
        select(User).where(
            and_(User.id == body.new_user_id, User.household_id == household.id)
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target user is not a member of this household",
        )

    assignment.assigned_to = body.new_user_id
    assignment.status = "pending"  # reset to pending after reassignment
    assignment.completed_at = None
    assignment.completed_by = None
    assignment.admin_verified = True
    await db.flush()
    await db.refresh(assignment)
    return assignment


# ── Points & Performance ───────────────────────────────────────────────────

@router.get("/points", response_model=list[PointsSummary])
async def get_points(
    week_start: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hh_id = await _require_household(current_user)
    ws = week_start if week_start else _monday(date.today())

    members_result = await db.execute(select(User).where(User.household_id == hh_id))
    members = {m.id: m for m in members_result.scalars().all()}

    assignments_result = await db.execute(
        select(ChoreAssignment).where(
            and_(
                ChoreAssignment.household_id == hh_id,
                ChoreAssignment.week_start == ws,
            )
        )
    )
    assignments = list(assignments_result.scalars().all())

    points: dict[uuid.UUID, float] = {uid: 0.0 for uid in members}
    for a in assignments:
        if a.status == "completed":
            points[a.assigned_to] = points.get(a.assigned_to, 0) + float(a.points_earned)

    return [
        PointsSummary(user_id=uid, full_name=members[uid].full_name, total_points=pts)
        for uid, pts in sorted(points.items(), key=lambda x: -x[1])
    ]


@router.get("/performance", response_model=list[PerformanceSummary])
async def get_performance(
    weeks: int = Query(4, ge=1, le=26),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return completion stats per member over the past *weeks* weeks."""
    hh_id = await _require_household(current_user)
    today = date.today()
    earliest = _monday(today) - timedelta(weeks=weeks)

    members_result = await db.execute(select(User).where(User.household_id == hh_id))
    members = {m.id: m for m in members_result.scalars().all()}

    assignments_result = await db.execute(
        select(ChoreAssignment).where(
            and_(
                ChoreAssignment.household_id == hh_id,
                ChoreAssignment.week_start >= earliest,
            )
        )
    )
    assignments = list(assignments_result.scalars().all())

    stats: dict[uuid.UUID, dict] = {
        uid: {"assigned": 0, "completed": 0, "missed": 0, "points": 0.0}
        for uid in members
    }

    for a in assignments:
        uid = a.assigned_to
        if uid not in stats:
            continue
        stats[uid]["assigned"] += 1
        if a.status == "completed":
            stats[uid]["completed"] += 1
            stats[uid]["points"] += float(a.points_earned)
        elif a.status == "missed":
            stats[uid]["missed"] += 1

    summaries = []
    for uid, s in stats.items():
        assigned = s["assigned"]
        completed = s["completed"]
        rate = (completed / assigned) if assigned > 0 else 0.0
        summaries.append(
            PerformanceSummary(
                user_id=uid,
                full_name=members[uid].full_name,
                assigned=assigned,
                completed=completed,
                missed=s["missed"],
                completion_rate=round(rate, 3),
                total_points=s["points"],
            )
        )

    return sorted(summaries, key=lambda x: -x.total_points)
