import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.household import Household
from app.models.user import User
from app.schemas.household import HouseholdCreate, HouseholdJoin, HouseholdResponse

router = APIRouter()


@router.post("/", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household(
    data: HouseholdCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already in a household")

    household = Household(
        name=data.name,
        listing_id=data.listing_id,
        admin_id=current_user.id,
        invite_code=secrets.token_urlsafe(8),
        max_members=data.max_members,
    )
    db.add(household)
    await db.flush()

    current_user.household_id = household.id
    await db.flush()
    await db.refresh(household)
    return household


@router.get("/mine", response_model=HouseholdResponse)
async def get_my_household(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not in a household")

    result = await db.execute(select(Household).where(Household.id == current_user.household_id))
    household = result.scalar_one_or_none()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    return household


@router.post("/join", response_model=HouseholdResponse)
async def join_household(
    data: HouseholdJoin,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already in a household")

    result = await db.execute(select(Household).where(Household.invite_code == data.invite_code))
    household = result.scalar_one_or_none()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")

    # Check member count
    member_result = await db.execute(select(User).where(User.household_id == household.id))
    members = list(member_result.scalars().all())
    if len(members) >= household.max_members:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Household is full")

    current_user.household_id = household.id
    await db.flush()
    await db.refresh(household)
    return household


@router.get("/members")
async def get_members(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not in a household")

    # Fetch household to get admin_id
    household_result = await db.execute(
        select(Household).where(Household.id == current_user.household_id)
    )
    household = household_result.scalar_one_or_none()

    result = await db.execute(select(User).where(User.household_id == current_user.household_id))
    members = result.scalars().all()
    admin_id = household.admin_id if household else None
    return [
        {
            "id": str(m.id),
            "full_name": m.full_name,
            "avatar_url": m.avatar_url,
            "trust_score": float(m.trust_score),
            "role": "admin" if m.id == admin_id else "member",
        }
        for m in members
    ]


@router.post("/invite")
async def generate_invite(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not in a household")

    result = await db.execute(select(Household).where(Household.id == current_user.household_id))
    household = result.scalar_one_or_none()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")

    if household.admin_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can generate invites")

    household.invite_code = secrets.token_urlsafe(8)
    await db.flush()
    return {"invite_code": household.invite_code}
