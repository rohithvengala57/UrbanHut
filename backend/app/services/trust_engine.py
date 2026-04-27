"""
Trust Score Calculation Engine

Score: 0-100, composed of 5 weighted pillars.
Recalculated weekly via Celery task + on-demand for critical events.

Principles:
1. Only objective behavioral data — never subjective ratings
2. Negative events decay over time (6-month half-life)
3. Positive patterns compound (consistency bonus)
4. Score always improvable — no permanent damage
5. No demographic inputs — only behavior
"""

import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trust_score import TrustEvent, TrustSnapshot
from app.models.user import User

log = structlog.get_logger("app.services.trust_engine")

PILLAR_WEIGHTS = {
    "verification": 20,
    "financial": 30,
    "household": 25,
    "tenure": 15,
    "community": 10,
}

VERIFICATION_POINTS = {
    "email_verified": 4,
    "phone_verified": 4,
    "photo_id_verified": 5,
    "linkedin_linked": 4,
    "lease_uploaded": 3,
}

DECAY_HALF_LIFE_DAYS = 180

# Cold-start baseline awarded on signup (before any verifications)
BASELINE_SCORE = 15.0

# Completeness bonuses awarded when profile fields are filled in
COMPLETENESS_POINTS = {
    "bio_added": 3,
    "avatar_uploaded": 2,
    "full_profile": 5,  # all lifestyle fields filled
}


class TrustEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def recalc_on_event(self, user_id: uuid.UUID, event_type: str) -> TrustSnapshot:
        """
        Immediately recalculate trust score on high-impact events.
        Call this in endpoint handlers for: verification_completed, bill_paid, chore_completed.
        """
        log.info(
            "trust_recalc_on_event_started",
            user_id=str(user_id),
            trigger_event=event_type,
        )
        snapshot = await self.calculate(user_id)
        log.info(
            "trust_recalc_on_event_complete",
            user_id=str(user_id),
            trigger_event=event_type,
            new_score=float(snapshot.total_score),
            trend=snapshot.trend,
        )
        return snapshot

    async def calculate(self, user_id: uuid.UUID) -> TrustSnapshot:
        log.debug("trust_score_calculation_started", user_id=str(user_id))

        try:
            events = await self._get_events(user_id)
        except Exception as exc:
            log.error(
                "trust_score_get_events_failed",
                user_id=str(user_id),
                error=str(exc),
                exc_info=True,
            )
            raise

        event_count = len(events)

        verification = self._calc_verification(events)
        financial = self._calc_financial(events)
        household = self._calc_household(events)
        tenure = self._calc_tenure(events)
        community = self._calc_community(events)

        # Apply baseline so new users start at a presentable score
        pillar_total = verification + financial + household + tenure + community
        total = max(BASELINE_SCORE, pillar_total)
        total = min(100.0, total)

        trend = await self._calc_trend(user_id, total)

        snapshot = TrustSnapshot(
            user_id=user_id,
            total_score=total,
            verification_score=verification,
            financial_score=financial,
            household_score=household,
            tenure_score=tenure,
            community_score=community,
            trend=trend,
        )
        self.db.add(snapshot)

        # Update user's cached trust score
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            previous_score = float(user.trust_score) if user.trust_score else 0.0
            user.trust_score = total
            user.trust_updated_at = datetime.now(timezone.utc)
            log.info(
                "trust_score_updated",
                user_id=str(user_id),
                previous_score=round(previous_score, 2),
                new_score=round(total, 2),
                delta=round(total - previous_score, 2),
                trend=trend,
                event_count=event_count,
                pillars={
                    "verification": round(verification, 2),
                    "financial": round(financial, 2),
                    "household": round(household, 2),
                    "tenure": round(tenure, 2),
                    "community": round(community, 2),
                },
            )
        else:
            log.warning(
                "trust_score_user_not_found_during_update",
                user_id=str(user_id),
                computed_score=round(total, 2),
            )

        return snapshot

    async def record_event(
        self,
        user_id: uuid.UUID,
        category: str,
        event_type: str,
        points_delta: float,
        metadata: dict | None = None,
    ) -> TrustEvent:
        log.info(
            "trust_event_recorded",
            user_id=str(user_id),
            category=category,
            event_type=event_type,
            points_delta=points_delta,
        )
        event = TrustEvent(
            user_id=user_id,
            category=category,
            event_type=event_type,
            points_delta=points_delta,
            event_metadata=metadata,
        )
        self.db.add(event)
        return event

    async def _get_events(self, user_id: uuid.UUID) -> list[TrustEvent]:
        result = await self.db.execute(
            select(TrustEvent)
            .where(TrustEvent.user_id == user_id)
            .order_by(TrustEvent.created_at.desc())
        )
        events = list(result.scalars().all())
        log.debug(
            "trust_events_fetched",
            user_id=str(user_id),
            event_count=len(events),
        )
        return events

    def _calc_verification(self, events: list[TrustEvent]) -> float:
        total = sum(
            float(e.points_delta)
            for e in events
            if e.category == "verification"
        )
        return min(total, PILLAR_WEIGHTS["verification"])

    def _calc_financial(self, events: list[TrustEvent]) -> float:
        financial_events = [e for e in events if e.category == "financial"]
        score = 0.0
        for e in financial_events:
            decay = self._get_decay_factor(e.created_at) if float(e.points_delta) < 0 else 1.0
            score += float(e.points_delta) * decay

        # Consistency bonus: 10+ consecutive on-time payments
        streak = self._get_ontime_streak(financial_events)
        if streak >= 10:
            score += 2.0

        return min(score, PILLAR_WEIGHTS["financial"])

    def _calc_household(self, events: list[TrustEvent]) -> float:
        household_events = [e for e in events if e.category == "household"]
        score = 0.0
        for e in household_events:
            decay = self._get_decay_factor(e.created_at) if float(e.points_delta) < 0 else 1.0
            score += float(e.points_delta) * decay

        # Bonus: 90%+ completion rate over 4 weeks
        completed = sum(1 for e in household_events if e.event_type == "chore_completed")
        missed = sum(1 for e in household_events if e.event_type == "chore_missed")
        total_chores = completed + missed
        if total_chores >= 8 and completed / total_chores >= 0.9:
            score += 3.0

        return max(0.0, min(score, PILLAR_WEIGHTS["household"]))

    def _calc_tenure(self, events: list[TrustEvent]) -> float:
        tenure_events = [e for e in events if e.category == "tenure"]
        score = 0.0
        for e in tenure_events:
            decay = self._get_decay_factor(e.created_at) if float(e.points_delta) < 0 else 1.0
            score += float(e.points_delta) * decay
        return max(0.0, min(score, PILLAR_WEIGHTS["tenure"]))

    def _calc_community(self, events: list[TrustEvent]) -> float:
        community_events = [e for e in events if e.category == "community"]
        score = 0.0

        vouch_points = 0.0
        event_points = 0.0
        given_points = 0.0

        for e in community_events:
            if e.event_type == "vouch_received":
                vouch_points = min(vouch_points + float(e.points_delta), 6.0)
            elif e.event_type == "event_attended":
                event_points = min(event_points + float(e.points_delta), 2.0)
            elif e.event_type == "vouch_given":
                given_points = min(given_points + float(e.points_delta), 1.0)
            elif e.event_type == "message_response_fast":
                score += float(e.points_delta)
            else:
                score += float(e.points_delta)

        score += vouch_points + event_points + given_points
        return max(0.0, min(score, PILLAR_WEIGHTS["community"]))

    def _get_ontime_streak(self, events: list[TrustEvent]) -> int:
        streak = 0
        for e in sorted(events, key=lambda x: x.created_at, reverse=True):
            if e.event_type == "bill_paid_ontime":
                streak += 1
            elif e.event_type == "bill_paid_late":
                break
        return streak

    def _get_decay_factor(self, event_date: datetime) -> float:
        now = datetime.now(timezone.utc)
        if event_date.tzinfo is None:
            event_date = event_date.replace(tzinfo=timezone.utc)
        days = (now - event_date).days
        return 0.5 ** (days / DECAY_HALF_LIFE_DAYS)

    async def _calc_trend(self, user_id: uuid.UUID, current_total: float) -> str:
        result = await self.db.execute(
            select(TrustSnapshot)
            .where(TrustSnapshot.user_id == user_id)
            .order_by(TrustSnapshot.calculated_at.desc())
            .limit(1)
        )
        previous = result.scalar_one_or_none()
        if not previous:
            return "stable"

        diff = current_total - float(previous.total_score)
        if diff > 1.0:
            return "rising"
        elif diff < -1.0:
            return "declining"
        return "stable"
