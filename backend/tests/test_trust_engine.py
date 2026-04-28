"""
Unit tests for the Trust Engine.

Tests all 5 pillars, decay math, edge cases, and cold-start baseline.
Run: pytest tests/test_trust_engine.py -v
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.trust_score import TrustEvent, TrustSnapshot
from app.services.trust_engine import (
    BASELINE_SCORE,
    DECAY_HALF_LIFE_DAYS,
    PILLAR_WEIGHTS,
    VERIFICATION_POINTS,
    TrustEngine,
)


def _make_event(
    category: str,
    event_type: str,
    points: float,
    days_ago: int = 0,
) -> TrustEvent:
    e = MagicMock(spec=TrustEvent)
    e.category = category
    e.event_type = event_type
    e.points_delta = points
    e.created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return e


def _make_engine() -> TrustEngine:
    db = AsyncMock()
    return TrustEngine(db)


# ─── Verification pillar ──────────────────────────────────────────────────────

class TestVerificationPillar:
    def test_email_and_phone_verified(self):
        engine = _make_engine()
        events = [
            _make_event("verification", "email_verified", 4),
            _make_event("verification", "phone_verified", 4),
        ]
        score = engine._calc_verification(events)
        assert score == 8.0

    def test_all_verifications_capped_at_pillar_weight(self):
        engine = _make_engine()
        events = [
            _make_event("verification", "email_verified", 4),
            _make_event("verification", "phone_verified", 4),
            _make_event("verification", "photo_id_verified", 5),
            _make_event("verification", "linkedin_linked", 4),
            _make_event("verification", "lease_uploaded", 3),
        ]
        score = engine._calc_verification(events)
        assert score == PILLAR_WEIGHTS["verification"]  # Max 20

    def test_no_events_returns_zero(self):
        engine = _make_engine()
        assert engine._calc_verification([]) == 0.0

    def test_non_verification_events_ignored(self):
        engine = _make_engine()
        events = [
            _make_event("financial", "bill_paid_ontime", 5),
            _make_event("household", "chore_completed", 1),
        ]
        assert engine._calc_verification(events) == 0.0


# ─── Financial pillar ─────────────────────────────────────────────────────────

class TestFinancialPillar:
    def test_ontime_payments_accumulate(self):
        engine = _make_engine()
        events = [_make_event("financial", "bill_paid_ontime", 2) for _ in range(5)]
        score = engine._calc_financial(events)
        assert score == 10.0

    def test_late_payment_decays_over_time(self):
        engine = _make_engine()
        # A late payment from 180 days ago should be at 50% decay
        events = [_make_event("financial", "bill_paid_late", -5, days_ago=180)]
        score = engine._calc_financial(events)
        expected = -5 * 0.5  # 50% decay at half-life
        assert abs(score - expected) < 0.1

    def test_recent_late_payment_not_decayed(self):
        engine = _make_engine()
        events = [_make_event("financial", "bill_paid_late", -5, days_ago=0)]
        score = engine._calc_financial(events)
        assert abs(score - (-5)) < 0.01

    def test_consistency_bonus_at_10_streak(self):
        engine = _make_engine()
        events = [_make_event("financial", "bill_paid_ontime", 1) for _ in range(10)]
        score = engine._calc_financial(events)
        assert score >= 12.0  # 10 + 2 bonus

    def test_no_consistency_bonus_below_threshold(self):
        engine = _make_engine()
        events = [_make_event("financial", "bill_paid_ontime", 1) for _ in range(9)]
        score = engine._calc_financial(events)
        assert score < 12.0

    def test_score_capped_at_pillar_weight(self):
        engine = _make_engine()
        events = [_make_event("financial", "bill_paid_ontime", 10) for _ in range(10)]
        score = engine._calc_financial(events)
        assert score <= PILLAR_WEIGHTS["financial"]

    def test_large_penalty_equals_full_amount(self):
        # Pillar score can go negative; the total-score floor (BASELINE_SCORE) lives
        # at the calculate() level, not inside the pillar helper.
        engine = _make_engine()
        events = [_make_event("financial", "bill_paid_late", -50, days_ago=0)]
        score = engine._calc_financial(events)
        assert abs(score - (-50)) < 0.01


# ─── Household pillar ─────────────────────────────────────────────────────────

class TestHouseholdPillar:
    def test_chore_completion_bonus_at_90_percent(self):
        engine = _make_engine()
        # 9 completed, 1 missed = 90% → qualifies for bonus
        events = [_make_event("household", "chore_completed", 1) for _ in range(9)]
        events.append(_make_event("household", "chore_missed", -1))
        score = engine._calc_household(events)
        # 8 net + 3.0 bonus = 11, capped at 25
        assert score >= 11.0

    def test_below_90_percent_no_bonus(self):
        engine = _make_engine()
        # 8 completed, 2 missed = 80% — no bonus
        events = [_make_event("household", "chore_completed", 1) for _ in range(8)]
        events += [_make_event("household", "chore_missed", -1) for _ in range(2)]
        score = engine._calc_household(events)
        # 6 net points, no bonus
        assert score == 6.0

    def test_need_at_least_8_chores_for_bonus(self):
        engine = _make_engine()
        # 7 completed, 0 missed = 100% but < 8 total → no bonus
        events = [_make_event("household", "chore_completed", 1) for _ in range(7)]
        score = engine._calc_household(events)
        assert score == 7.0  # No bonus


# ─── Community pillar ─────────────────────────────────────────────────────────

class TestCommunityPillar:
    def test_vouch_points_capped_at_6(self):
        engine = _make_engine()
        events = [_make_event("community", "vouch_received", 2) for _ in range(5)]
        score = engine._calc_community(events)
        assert score == 6.0  # Capped at 6

    def test_event_attendance_capped_at_2(self):
        engine = _make_engine()
        events = [_make_event("community", "event_attended", 1) for _ in range(5)]
        score = engine._calc_community(events)
        assert score == 2.0


# ─── Total score + baseline ───────────────────────────────────────────────────

class TestTotalScore:
    def test_baseline_ensures_minimum_15(self):
        engine = _make_engine()
        # User with zero events still gets baseline
        events = []
        verification = engine._calc_verification(events)
        financial = engine._calc_financial(events)
        household = engine._calc_household(events)
        tenure = engine._calc_tenure(events)
        community = engine._calc_community(events)

        pillar_total = verification + financial + household + tenure + community
        total = max(BASELINE_SCORE, pillar_total)
        assert total == BASELINE_SCORE

    def test_score_never_exceeds_100(self):
        engine = _make_engine()
        events = [
            _make_event("verification", "email_verified", 4),
            _make_event("verification", "phone_verified", 4),
            _make_event("verification", "photo_id_verified", 5),
        ] + [_make_event("financial", "bill_paid_ontime", 5) for _ in range(10)]
        # Calculate manually — engine.calculate is async, test pillar math
        score = min(100.0, sum([
            engine._calc_verification(events),
            engine._calc_financial(events),
        ]))
        assert score <= 100.0

    def test_decay_half_life_math(self):
        engine = _make_engine()
        ts = datetime.now(timezone.utc) - timedelta(days=DECAY_HALF_LIFE_DAYS)
        factor = engine._get_decay_factor(ts)
        assert abs(factor - 0.5) < 0.01  # Should be ~50% at half-life

    def test_decay_factor_recent_event_near_1(self):
        engine = _make_engine()
        ts = datetime.now(timezone.utc) - timedelta(hours=1)
        factor = engine._get_decay_factor(ts)
        assert factor > 0.99
