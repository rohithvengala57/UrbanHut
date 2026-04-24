"""
Resource-level authorization dependencies for FastAPI.

Usage:
    @router.delete("/{listing_id}")
    async def delete_listing(
        listing_id: uuid.UUID,
        listing: Listing = Depends(require_listing_owner),
        ...
    ):
"""

import uuid

import structlog
from fastapi import Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.household import Household
from app.models.listing import Listing
from app.models.user import User

log = structlog.get_logger("app.middleware.permissions")


# ─── Listing ownership ────────────────────────────────────────────────────────

async def require_listing_owner(
    listing_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Listing:
    """Inject the listing and assert the current user is the host."""
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()

    if not listing:
        log.info(
            "permission_listing_not_found",
            listing_id=str(listing_id),
            user_id=str(current_user.id),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.host_id != current_user.id:
        log.warning(
            "permission_denied_not_listing_owner",
            listing_id=str(listing_id),
            user_id=str(current_user.id),
            actual_host_id=str(listing.host_id),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the listing host can perform this action",
        )

    return listing


# ─── Household membership ─────────────────────────────────────────────────────

async def require_household_member(
    household_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Household:
    """Assert the current user is a member of the household."""
    result = await db.execute(select(Household).where(Household.id == household_id))
    household = result.scalar_one_or_none()

    if not household:
        log.info(
            "permission_household_not_found",
            household_id=str(household_id),
            user_id=str(current_user.id),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")

    if current_user.household_id != household.id:
        log.warning(
            "permission_denied_not_household_member",
            household_id=str(household_id),
            user_id=str(current_user.id),
            user_household_id=str(current_user.household_id),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this household",
        )

    return household


async def require_household_admin(
    household_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Household:
    """Assert the current user is the admin of the household."""
    result = await db.execute(select(Household).where(Household.id == household_id))
    household = result.scalar_one_or_none()

    if not household:
        log.info(
            "permission_household_not_found",
            household_id=str(household_id),
            user_id=str(current_user.id),
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")

    if current_user.household_id != household.id:
        log.warning(
            "permission_denied_not_household_member",
            household_id=str(household_id),
            user_id=str(current_user.id),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this household",
        )

    if household.admin_id != current_user.id:
        log.warning(
            "permission_denied_not_household_admin",
            household_id=str(household_id),
            user_id=str(current_user.id),
            actual_admin_id=str(household.admin_id),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the household admin can perform this action",
        )

    return household


# ─── Self-resource guard ──────────────────────────────────────────────────────

def require_self_or_admin(target_user_id: uuid.UUID, current_user: User) -> None:
    """Raise 403 if current_user is neither the target user nor an admin."""
    if current_user.id != target_user_id and current_user.role != "admin":
        log.warning(
            "permission_denied_not_self_or_admin",
            user_id=str(current_user.id),
            target_user_id=str(target_user_id),
            user_role=current_user.role,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own resources",
        )


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Inject the current user, asserting they are an admin."""
    if current_user.role != "admin":
        log.warning(
            "permission_denied_not_admin",
            user_id=str(current_user.id),
            user_role=current_user.role,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
