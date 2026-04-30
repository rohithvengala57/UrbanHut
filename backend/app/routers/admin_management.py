import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.permissions import require_admin
from app.models.household import Household
from app.models.listing import Listing
from app.models.match import MatchInterest
from app.models.chat import ChatRoom, ChatMessage
from app.models.user import User

router = APIRouter()


class AdminUserSummary(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    status: str
    household_id: uuid.UUID | None = None
    trust_score: float
    created_at: str


class AdminUsersListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AdminUserSummary]


class AdminUserUpdateRequest(BaseModel):
    role: str | None = Field(default=None, min_length=1, max_length=20)
    status: str | None = Field(default=None, min_length=1, max_length=20)


class AdminUserDetailResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None = None
    role: str
    status: str
    household_id: uuid.UUID | None = None
    trust_score: float
    created_at: str
    updated_at: str


class AdminListingsListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[dict]


class AdminHouseholdsListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[dict]


class AdminInterestsListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[dict]


class AdminMessagesListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[dict]


_ALLOWED_ROLES = {"admin", "member", "user"}
_ALLOWED_STATUSES = {"active", "inactive", "suspended"}


@router.get("/users", response_model=AdminUsersListResponse)
async def list_users(
    search: str | None = Query(default=None, max_length=200),
    role: str | None = Query(default=None, max_length=20),
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    del admin
    where_clauses = []

    if search:
        pattern = f"%{search.strip()}%"
        where_clauses.append(
            or_(
                User.email.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )

    if role:
        where_clauses.append(User.role == role)

    if status_filter:
        where_clauses.append(User.status == status_filter)

    count_stmt = select(func.count(User.id))
    if where_clauses:
        count_stmt = count_stmt.where(*where_clauses)

    total = await db.scalar(count_stmt) or 0

    stmt = select(User)
    if where_clauses:
        stmt = stmt.where(*where_clauses)

    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    users = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "status": user.status,
                "household_id": user.household_id,
                "trust_score": float(user.trust_score),
                "created_at": user.created_at.isoformat(),
            }
            for user in users
        ],
    }


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
async def get_user_detail(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    del admin
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "status": user.status,
        "household_id": user.household_id,
        "trust_score": float(user.trust_score),
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }


@router.get("/listings", response_model=AdminListingsListResponse)
async def list_listings(
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    city: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    del admin
    where_clauses = []
    if status_filter:
        where_clauses.append(Listing.status == status_filter)
    if city:
        where_clauses.append(Listing.city.ilike(city.strip()))

    count_stmt = select(func.count(Listing.id))
    if where_clauses:
        count_stmt = count_stmt.where(*where_clauses)
    total = await db.scalar(count_stmt) or 0

    interest_count_subq = (
        select(
            MatchInterest.to_listing_id.label("listing_id"),
            func.count(MatchInterest.id).label("interest_count"),
        )
        .where(MatchInterest.to_listing_id.is_not(None))
        .group_by(MatchInterest.to_listing_id)
        .subquery()
    )

    stmt = (
        select(
            Listing.id,
            Listing.title,
            Listing.city,
            Listing.status,
            Listing.view_count,
            Listing.created_at,
            User.id.label("owner_id"),
            User.full_name.label("owner_name"),
            func.coalesce(interest_count_subq.c.interest_count, 0).label("interest_count"),
        )
        .join(User, User.id == Listing.host_id)
        .outerjoin(interest_count_subq, interest_count_subq.c.listing_id == Listing.id)
        .order_by(Listing.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if where_clauses:
        stmt = stmt.where(*where_clauses)

    rows = (await db.execute(stmt)).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": row.id,
                "title": row.title,
                "owner": {
                    "id": row.owner_id,
                    "full_name": row.owner_name,
                },
                "city": row.city,
                "status": row.status,
                "metrics": {
                    "view_count": row.view_count or 0,
                    "interest_count": int(row.interest_count or 0),
                },
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ],
    }


@router.get("/households", response_model=AdminHouseholdsListResponse)
async def list_households(
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    del admin
    where_clauses = []
    if status_filter:
        where_clauses.append(Household.status == status_filter)

    count_stmt = select(func.count(Household.id))
    if where_clauses:
        count_stmt = count_stmt.where(*where_clauses)
    total = await db.scalar(count_stmt) or 0

    member_count_subq = (
        select(
            User.household_id.label("household_id"),
            func.count(User.id).label("member_count"),
        )
        .where(User.household_id.is_not(None))
        .group_by(User.household_id)
        .subquery()
    )

    stmt = (
        select(
            Household.id,
            Household.name,
            Household.status,
            Household.created_at,
            func.coalesce(member_count_subq.c.member_count, 0).label("member_count"),
        )
        .outerjoin(member_count_subq, member_count_subq.c.household_id == Household.id)
        .order_by(Household.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if where_clauses:
        stmt = stmt.where(*where_clauses)

    rows = (await db.execute(stmt)).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": row.id,
                "name": row.name,
                "status": row.status,
                "member_count": int(row.member_count or 0),
                "feature_status": {
                    "is_active": row.status == "active",
                    "has_members": int(row.member_count or 0) > 0,
                },
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ],
    }


@router.patch("/users/{user_id}", response_model=AdminUserDetailResponse)
async def update_user_admin(
    user_id: uuid.UUID,
    body: AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.role is not None:
        if body.role not in _ALLOWED_ROLES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        user.role = body.role

    if body.status is not None:
        if body.status not in _ALLOWED_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
        user.status = body.status

    # Prevent accidental admin lockout by self-demotion/deactivation in one step.
    if user.id == admin.id and (user.role != "admin" or user.status != "active"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot remove own active admin access",
        )

    db.add(user)
    await db.flush()
    await db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "status": user.status,
        "household_id": user.household_id,
        "trust_score": float(user.trust_score),
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat(),
    }


@router.get("/interests", response_model=AdminInterestsListResponse)
async def list_interests(
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    del admin
    where_clauses = []
    if status_filter:
        where_clauses.append(MatchInterest.status == status_filter)

    count_stmt = select(func.count(MatchInterest.id))
    if where_clauses:
        count_stmt = count_stmt.where(*where_clauses)
    total = await db.scalar(count_stmt) or 0

    from_user_alias = select(User).subquery().alias("from_user")
    to_user_alias = select(User).subquery().alias("to_user")

    stmt = (
        select(
            MatchInterest.id,
            MatchInterest.status,
            MatchInterest.compatibility_score,
            MatchInterest.created_at,
            from_user_alias.c.id.label("from_user_id"),
            from_user_alias.c.full_name.label("from_user_name"),
            Listing.id.label("to_listing_id"),
            Listing.title.label("to_listing_title"),
            to_user_alias.c.id.label("to_user_id"),
            to_user_alias.c.full_name.label("to_user_name"),
        )
        .join(from_user_alias, from_user_alias.c.id == MatchInterest.from_user_id)
        .outerjoin(Listing, Listing.id == MatchInterest.to_listing_id)
        .outerjoin(to_user_alias, to_user_alias.c.id == MatchInterest.to_user_id)
        .order_by(MatchInterest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if where_clauses:
        stmt = stmt.where(*where_clauses)

    rows = (await db.execute(stmt)).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": row.id,
                "status": row.status,
                "compatibility_score": float(row.compatibility_score) if row.compatibility_score else None,
                "created_at": row.created_at.isoformat(),
                "from_user": {"id": row.from_user_id, "full_name": row.from_user_name},
                "to_listing": {"id": row.to_listing_id, "title": row.to_listing_title} if row.to_listing_id else None,
                "to_user": {"id": row.to_user_id, "full_name": row.to_user_name} if row.to_user_id else None,
            }
            for row in rows
        ],
    }


@router.get("/messages", response_model=AdminMessagesListResponse)
async def list_messages(
    status_filter: str | None = Query(default=None, alias="status", max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    del admin
    where_clauses = []
    if status_filter:
        where_clauses.append(ChatRoom.status == status_filter)

    count_stmt = select(func.count(ChatRoom.id))
    if where_clauses:
        count_stmt = count_stmt.where(*where_clauses)
    total = await db.scalar(count_stmt) or 0

    user_a_alias = select(User).subquery().alias("user_a")
    user_b_alias = select(User).subquery().alias("user_b")

    # Get last message for each room
    last_msg_subq = (
        select(
            ChatMessage.room_id,
            ChatMessage.body,
            func.row_number().over(
                partition_by=ChatMessage.room_id,
                order_by=ChatMessage.created_at.desc()
            ).label("rn")
        )
        .subquery()
    )
    last_msg_stmt = select(last_msg_subq).where(last_msg_subq.c.rn == 1).subquery()

    stmt = (
        select(
            ChatRoom.id,
            ChatRoom.status,
            ChatRoom.created_at,
            user_a_alias.c.id.label("user_a_id"),
            user_a_alias.c.full_name.label("user_a_name"),
            user_b_alias.c.id.label("user_b_id"),
            user_b_alias.c.full_name.label("user_b_name"),
            Listing.title.label("listing_title"),
            last_msg_stmt.c.body.label("last_message"),
        )
        .join(user_a_alias, user_a_alias.c.id == ChatRoom.user_a_id)
        .join(user_b_alias, user_b_alias.c.id == ChatRoom.user_b_id)
        .outerjoin(Listing, Listing.id == ChatRoom.listing_id)
        .outerjoin(last_msg_stmt, last_msg_stmt.c.room_id == ChatRoom.id)
        .order_by(ChatRoom.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if where_clauses:
        stmt = stmt.where(*where_clauses)

    rows = (await db.execute(stmt)).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": row.id,
                "status": row.status,
                "created_at": row.created_at.isoformat(),
                "user_a": {"id": row.user_a_id, "full_name": row.user_a_name},
                "user_b": {"id": row.user_b_id, "full_name": row.user_b_name},
                "listing_title": row.listing_title,
                "last_message": row.last_message,
            }
            for row in rows
        ],
    }
