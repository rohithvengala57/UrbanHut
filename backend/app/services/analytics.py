from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import TelemetryEvent, UserAttribution

ACTIVATION_EVENTS = {"chat_message_sent", "mutual_match_created"}


def _clean_touch(touch: dict[str, Any] | None) -> dict[str, Any] | None:
    if not touch:
        return None
    cleaned = {
        "source": touch.get("source"),
        "medium": touch.get("medium"),
        "campaign": touch.get("campaign"),
        "term": touch.get("term"),
        "content": touch.get("content"),
        "city": touch.get("city"),
    }
    cleaned = {k: v for k, v in cleaned.items() if v not in (None, "")}
    return cleaned or None


def extract_attribution_from_request(request: Request) -> dict[str, Any] | None:
    qp = request.query_params
    source = qp.get("utm_source") or request.headers.get("X-UTM-Source")
    medium = qp.get("utm_medium") or request.headers.get("X-UTM-Medium")
    campaign = qp.get("utm_campaign") or request.headers.get("X-UTM-Campaign")
    term = qp.get("utm_term") or request.headers.get("X-UTM-Term")
    content = qp.get("utm_content") or request.headers.get("X-UTM-Content")
    city = qp.get("city") or qp.get("utm_city") or request.headers.get("X-UTM-City")
    return _clean_touch(
        {
            "source": source,
            "medium": medium,
            "campaign": campaign,
            "term": term,
            "content": content,
            "city": city,
        }
    )


async def upsert_user_attribution(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    first_touch: dict[str, Any] | None = None,
    last_touch: dict[str, Any] | None = None,
    mark_signup: bool = False,
    mark_activation: bool = False,
    at: datetime | None = None,
) -> UserAttribution:
    now = at or datetime.now(timezone.utc)
    first_touch = _clean_touch(first_touch)
    last_touch = _clean_touch(last_touch)

    result = await db.execute(select(UserAttribution).where(UserAttribution.user_id == user_id))
    attr = result.scalar_one_or_none()
    if not attr:
        attr = UserAttribution(user_id=user_id)
        db.add(attr)

    if first_touch and not attr.first_touch:
        attr.first_touch = first_touch
        attr.first_touch_source = first_touch.get("source")
        attr.first_touch_medium = first_touch.get("medium")
        attr.first_touch_campaign = first_touch.get("campaign")
        attr.first_touch_city = first_touch.get("city")
        attr.first_touch_at = attr.first_touch_at or now

    if last_touch:
        attr.last_touch = last_touch
        attr.last_touch_source = last_touch.get("source")
        attr.last_touch_medium = last_touch.get("medium")
        attr.last_touch_campaign = last_touch.get("campaign")
        attr.last_touch_city = last_touch.get("city")
        attr.last_touch_at = now

    if mark_signup and not attr.signup_at:
        attr.signup_at = now

    if mark_activation and not attr.first_activation_at:
        attr.first_activation_at = now

    await db.flush()
    return attr


async def record_event(
    db: AsyncSession,
    *,
    event_name: str,
    user_id: uuid.UUID | None = None,
    household_id: uuid.UUID | None = None,
    source: str = "backend",
    session_id: str | None = None,
    occurred_at: datetime | None = None,
    properties: dict[str, Any] | None = None,
    first_touch: dict[str, Any] | None = None,
    last_touch: dict[str, Any] | None = None,
    notes: str | None = None,
) -> TelemetryEvent:
    ts = occurred_at or datetime.now(timezone.utc)
    ft = _clean_touch(first_touch)
    lt = _clean_touch(last_touch)
    channel_touch = lt or ft or {}

    event = TelemetryEvent(
        user_id=user_id,
        household_id=household_id,
        event_name=event_name,
        source=source,
        session_id=session_id,
        occurred_at=ts,
        event_date=ts.date(),
        utm_source=channel_touch.get("source"),
        utm_medium=channel_touch.get("medium"),
        utm_campaign=channel_touch.get("campaign"),
        city=(channel_touch.get("city") or (properties or {}).get("city")),
        properties=properties or {},
        first_touch=ft,
        last_touch=lt,
        notes=notes,
    )
    db.add(event)
    await db.flush()
    return event


async def track_backend_event(
    db: AsyncSession,
    *,
    event_name: str,
    user_id: uuid.UUID | None,
    household_id: uuid.UUID | None = None,
    properties: dict[str, Any] | None = None,
    source: str = "backend",
    session_id: str | None = None,
    first_touch: dict[str, Any] | None = None,
    last_touch: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> TelemetryEvent:
    ts = occurred_at or datetime.now(timezone.utc)
    attr: UserAttribution | None = None

    if user_id:
        mark_activation = event_name in ACTIVATION_EVENTS
        attr = await upsert_user_attribution(
            db,
            user_id,
            first_touch=first_touch,
            last_touch=last_touch,
            mark_signup=(event_name == "signup_completed"),
            mark_activation=mark_activation,
            at=ts,
        )

    return await record_event(
        db,
        event_name=event_name,
        user_id=user_id,
        household_id=household_id,
        source=source,
        session_id=session_id,
        occurred_at=ts,
        properties=properties or {},
        first_touch=first_touch or (attr.first_touch if attr else None),
        last_touch=last_touch or (attr.last_touch if attr else None),
    )
