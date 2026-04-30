import uuid
from datetime import date, timedelta
from typing import Any

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.household import Household
from app.models.analytics import TelemetryEvent
from app.models.match import MatchInterest
from app.middleware.permissions import require_admin

router = APIRouter()
log = structlog.get_logger("app.routers.admin_metrics")

@router.get("/overview")
async def get_overview_metrics(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get high-level KPI metrics for the admin dashboard."""
    
    # Total counts
    total_users = await db.scalar(select(func.count(User.id)))
    total_listings = await db.scalar(select(func.count(Listing.id)))
    total_households = await db.scalar(select(func.count(Household.id)))
    
    # Active today (based on telemetry)
    today = date.today()
    active_today = await db.scalar(
        select(func.count(func.distinct(TelemetryEvent.user_id)))
        .where(TelemetryEvent.event_date == today)
    )
    
    # New today
    new_users_today = await db.scalar(
        select(func.count(User.id))
        .where(func.date(User.created_at) == today)
    )
    
    # Active Listings (published)
    active_listings = await db.scalar(
        select(func.count(Listing.id))
        .where(Listing.status == "published")
    )
    
    return {
        "kpis": {
            "total_users": total_users or 0,
            "new_users_today": new_users_today or 0,
            "dau": active_today or 0,
            "total_listings": total_listings or 0,
            "active_listings": active_listings or 0,
            "total_households": total_households or 0,
        },
        "highlights": {
            "stickiness": round((active_today / total_users * 100), 1) if total_users else 0,
            "marketplace_health": "stable" if active_listings > 0 else "cold"
        }
    }

@router.get("/user-growth")
async def get_user_growth(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get daily user signup counts for charts."""
    since = date.today() - timedelta(days=days)
    
    stmt = (
        select(
            func.date(User.created_at).label("date"),
            func.count(User.id).label("count")
        )
        .where(func.date(User.created_at) >= since)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return {
        "days": days,
        "data": [{"date": row.date.isoformat(), "count": row.count} for row in rows]
    }

@router.get("/feature-usage")
async def get_feature_usage(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get most used features based on telemetry events."""
    since = date.today() - timedelta(days=days)
    
    stmt = (
        select(
            TelemetryEvent.event_name,
            func.count(TelemetryEvent.id).label("total_hits"),
            func.count(func.distinct(TelemetryEvent.user_id)).label("unique_users")
        )
        .where(TelemetryEvent.event_date >= since)
        .group_by(TelemetryEvent.event_name)
        .order_by(desc("total_hits"))
        .limit(10)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return {
        "window_days": days,
        "features": [
            {
                "name": row.event_name,
                "total_hits": row.total_hits,
                "unique_users": row.unique_users
            }
            for row in rows
        ]
    }

@router.get("/users/{user_id}/events")
async def get_user_events(
    user_id: uuid.UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get chronological event timeline for a specific user."""
    stmt = (
        select(TelemetryEvent)
        .where(TelemetryEvent.user_id == user_id)
        .order_by(TelemetryEvent.occurred_at.desc())
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    events = result.scalars().all()
    
    return {
        "user_id": user_id,
        "count": len(events),
        "events": [
            {
                "id": str(event.id),
                "event_name": event.event_name,
                "occurred_at": event.occurred_at.isoformat(),
                "source": event.source,
                "properties": event.properties,
                "utm_source": event.utm_source,
                "utm_medium": event.utm_medium,
                "utm_campaign": event.utm_campaign,
                "city": event.city
            }
            for event in events
        ]
    }


@router.get("/users")
async def get_users_management(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get latest users with lightweight management metadata."""
    safe_limit = max(1, min(limit, 100))
    users_result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .limit(safe_limit)
    )
    users = list(users_result.scalars().all())

    user_ids = [user.id for user in users]
    listing_counts: dict[uuid.UUID, int] = {}
    if user_ids:
        listing_result = await db.execute(
            select(Listing.host_id, func.count(Listing.id))
            .where(Listing.host_id.in_(user_ids))
            .group_by(Listing.host_id)
        )
        listing_counts = {host_id: count for host_id, count in listing_result.all()}

    return {
        "count": len(users),
        "users": [
            {
                "id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
                "status": user.status,
                "trust_score": float(user.trust_score),
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "listing_count": listing_counts.get(user.id, 0),
            }
            for user in users
        ]
    }


@router.get("/listings")
async def get_listings_management(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get latest listings with host and demand indicators."""
    safe_limit = max(1, min(limit, 100))
    listing_result = await db.execute(
        select(Listing, User.full_name, User.email)
        .join(User, User.id == Listing.host_id)
        .order_by(Listing.created_at.desc())
        .limit(safe_limit)
    )
    rows = listing_result.all()
    listings = [row[0] for row in rows]
    listing_ids = [listing.id for listing in listings]

    interest_counts: dict[uuid.UUID, int] = {}
    if listing_ids:
        interest_result = await db.execute(
            select(MatchInterest.to_listing_id, func.count(MatchInterest.id))
            .where(MatchInterest.to_listing_id.in_(listing_ids))
            .group_by(MatchInterest.to_listing_id)
        )
        interest_counts = {
            listing_id: count
            for listing_id, count in interest_result.all()
            if listing_id is not None
        }

    return {
        "count": len(rows),
        "listings": [
            {
                "id": str(listing.id),
                "title": listing.title,
                "city": listing.city,
                "state": listing.state,
                "status": listing.status,
                "rent_monthly": listing.rent_monthly,
                "is_verified": listing.is_verified,
                "view_count": listing.view_count,
                "created_at": listing.created_at.isoformat() if listing.created_at else None,
                "host_name": host_name,
                "host_email": host_email,
                "interest_count": interest_counts.get(listing.id, 0),
            }
            for listing, host_name, host_email in rows
        ]
    }
