import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analytics import TelemetryEvent
from app.models.user import User
from app.services.analytics import record_event, track_backend_event

router = APIRouter()
log = structlog.get_logger("app.routers.telemetry")
_bearer = HTTPBearer(auto_error=False)

Track2EventName = Literal[
    "landing_page_viewed",
    "signup_started",
    "signup_completed",
    "profile_completed",
    "verification_started",
    "verification_submitted",
    "listing_created",
    "listing_published",
    "interest_sent",
    "mutual_match_created",
    "chat_room_created",
    "chat_message_sent",
    "household_created",
    "household_member_joined",
    "expense_created",
    "chore_completed",
]

REQUIRED_PROPERTIES: dict[str, set[str]] = {
    "landing_page_viewed": {"source", "medium", "campaign", "city"},
    "verification_started": {"verification_type"},
    "verification_submitted": {"verification_type"},
    "listing_created": {"listing_id"},
    "listing_published": {"listing_id"},
    "interest_sent": {"listing_id"},
    "chat_room_created": {"room_id"},
    "chat_message_sent": {"room_id"},
    "household_created": {"household_id"},
    "household_member_joined": {"household_id"},
    "expense_created": {"expense_id"},
    "chore_completed": {"assignment_id"},
}


class TelemetryEventIn(BaseModel):
    event_name: Track2EventName
    properties: dict[str, Any] = Field(default_factory=dict)
    source: str = "mobile"
    session_id: str | None = None
    occurred_at: datetime | None = None
    first_touch: dict[str, Any] | None = None
    last_touch: dict[str, Any] | None = None


class TelemetryBatchIn(BaseModel):
    events: list[TelemetryEventIn] = Field(min_length=1, max_length=100)


async def _get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None

    from app.utils.security import decode_token

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    return result.scalar_one_or_none()


def _parse_household_id(properties: dict[str, Any]) -> uuid.UUID | None:
    raw = properties.get("household_id")
    if raw in (None, ""):
        return None
    try:
        return uuid.UUID(str(raw))
    except (ValueError, TypeError):
        return None


@router.post("/events", status_code=status.HTTP_204_NO_CONTENT)
async def ingest_telemetry_events(
    payload: TelemetryBatchIn,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(_get_optional_user),
):
    for event in payload.events:
        required = REQUIRED_PROPERTIES.get(event.event_name, set())
        missing = sorted(k for k in required if event.properties.get(k) in (None, ""))
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Missing required properties for '{event.event_name}': "
                    + ", ".join(missing)
                ),
            )

        household_id = _parse_household_id(event.properties)
        occurred_at = (
            event.occurred_at.astimezone(timezone.utc)
            if event.occurred_at
            else datetime.now(timezone.utc)
        )
        if current_user:
            await track_backend_event(
                db,
                event_name=event.event_name,
                user_id=current_user.id,
                household_id=household_id,
                source=event.source,
                session_id=event.session_id,
                occurred_at=occurred_at,
                properties=event.properties,
                first_touch=event.first_touch,
                last_touch=event.last_touch,
            )
        else:
            await record_event(
                db,
                event_name=event.event_name,
                user_id=None,
                household_id=household_id,
                source=event.source,
                session_id=event.session_id,
                occurred_at=occurred_at,
                properties=event.properties,
                first_touch=event.first_touch,
                last_touch=event.last_touch,
            )

        log.info(
            "track2_event_ingested",
            event_name=event.event_name,
            source=event.source,
            session_id=event.session_id,
            occurred_at=occurred_at.isoformat(),
            properties=event.properties,
            first_touch=event.first_touch,
            last_touch=event.last_touch,
        )


ACTIVE_HOUSEHOLD_EVENTS = (
    "listing_published",
    "interest_sent",
    "chat_message_sent",
    "mutual_match_created",
    "expense_created",
    "chore_completed",
)
ACTIVATION_EVENTS = ("chat_message_sent", "mutual_match_created")


@router.get("/funnel/daily")
async def daily_funnel(
    days: int = Query(default=30, ge=1, le=180),
    city: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Daily backend funnel aggregates for Track 2 dashboards.

    Step definitions:
    - visitors: `landing_page_viewed`
    - signups: `signup_completed`
    - activations: `chat_message_sent` or `mutual_match_created`
    - active_households: distinct households with meaningful value events
    """
    since = date.today() - timedelta(days=days - 1)
    channel = func.coalesce(TelemetryEvent.utm_source, TelemetryEvent.source, "unknown")
    conditions = [TelemetryEvent.event_date >= since]
    if city:
        conditions.append(TelemetryEvent.city.ilike(f"%{city}%"))

    stmt = (
        select(
            TelemetryEvent.event_date.label("date"),
            channel.label("channel"),
            func.count(case((TelemetryEvent.event_name == "landing_page_viewed", 1))).label("visitors"),
            func.count(case((TelemetryEvent.event_name == "signup_completed", 1))).label("signups"),
            func.count(case((TelemetryEvent.event_name.in_(ACTIVATION_EVENTS), 1))).label("activations"),
            func.count(
                func.distinct(
                    case(
                        (
                            and_(
                                TelemetryEvent.event_name.in_(ACTIVE_HOUSEHOLD_EVENTS),
                                TelemetryEvent.household_id.is_not(None),
                            ),
                            TelemetryEvent.household_id,
                        ),
                        else_=None,
                    )
                )
            ).label("active_households"),
        )
        .where(*conditions)
        .group_by(TelemetryEvent.event_date, channel)
        .order_by(TelemetryEvent.event_date.asc(), channel.asc())
    )

    rows = (await db.execute(stmt)).all()
    return {
        "window_days": days,
        "city_filter": city,
        "rows": [
            {
                "date": r.date.isoformat(),
                "channel": r.channel,
                "visitors": int(r.visitors or 0),
                "signups": int(r.signups or 0),
                "activations": int(r.activations or 0),
                "active_households": int(r.active_households or 0),
                "visitor_to_signup_pct": round((r.signups / r.visitors) * 100, 2) if r.visitors else 0.0,
                "signup_to_activation_pct": (
                    round((r.activations / r.signups) * 100, 2) if r.signups else 0.0
                ),
            }
            for r in rows
        ],
    }
