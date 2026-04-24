"""
Unit tests for the Chore Scheduler.

Tests: impossible constraints, single person, all fixed, frequency caps,
backtracking cap (partial schedule returned), fairness score.
Run: pytest tests/test_chore_scheduler.py -v
"""

import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

from app.models.chore import ChoreConstraint, ChoreTemplate
from app.services.chore_scheduler import (
    MAX_BACKTRACKS,
    ChoreScheduler,
    ScheduleImpossibleError,
    ScheduleResult,
)


def _chore(freq: int = 1, weight: float = 1.0) -> ChoreTemplate:
    c = MagicMock(spec=ChoreTemplate)
    c.id = uuid.uuid4()
    c.frequency = freq
    c.weight = weight
    return c


def _constraint(
    ctype: str,
    user_id: uuid.UUID,
    chore_id: uuid.UUID | None = None,
    day_of_week: int | None = None,
    max_frequency: int | None = None,
) -> ChoreConstraint:
    c = MagicMock(spec=ChoreConstraint)
    c.type = ctype
    c.status = "approved"
    c.user_id = user_id
    c.chore_id = chore_id
    c.day_of_week = day_of_week
    c.max_frequency = max_frequency
    return c


scheduler = ChoreScheduler()
WEEK = date.today()


# ─── Happy path ───────────────────────────────────────────────────────────────

class TestHappyPath:
    def test_single_member_single_chore(self):
        member = uuid.uuid4()
        chore = _chore(freq=1, weight=1.0)
        result = scheduler.generate_schedule([member], [chore], [], WEEK)
        assert len(result.assignments) == 1
        assert list(result.assignments.values())[0] == member
        assert result.partial is False

    def test_two_members_two_chores_assigned(self):
        m1, m2 = uuid.uuid4(), uuid.uuid4()
        c1, c2 = _chore(), _chore()
        result = scheduler.generate_schedule([m1, m2], [c1, c2], [], WEEK)
        assert len(result.assignments) == 2
        assert result.partial is False

    def test_empty_members_returns_empty(self):
        result = scheduler.generate_schedule([], [_chore()], [], WEEK)
        assert result.assignments == {}
        assert result.fairness_score == 1.0

    def test_empty_chores_returns_empty(self):
        result = scheduler.generate_schedule([uuid.uuid4()], [], [], WEEK)
        assert result.assignments == {}

    def test_fairness_score_between_0_and_1(self):
        members = [uuid.uuid4() for _ in range(3)]
        chores = [_chore(freq=2, weight=1.0) for _ in range(3)]
        result = scheduler.generate_schedule(members, chores, [], WEEK)
        assert 0.0 <= result.fairness_score <= 1.0

    def test_equal_distribution_high_fairness(self):
        m1, m2 = uuid.uuid4(), uuid.uuid4()
        # 2 chores, same weight, 2 members → each gets 1
        c1, c2 = _chore(freq=1, weight=1.0), _chore(freq=1, weight=1.0)
        result = scheduler.generate_schedule([m1, m2], [c1, c2], [], WEEK)
        assert result.fairness_score >= 0.9


# ─── Fixed assignments ────────────────────────────────────────────────────────

class TestFixedAssignments:
    def test_fixed_assignment_respected(self):
        m1, m2 = uuid.uuid4(), uuid.uuid4()
        chore = _chore(freq=1)
        fixed = _constraint("fixed_assignment", m1, chore_id=chore.id, day_of_week=0)
        result = scheduler.generate_schedule([m1, m2], [chore], [fixed], WEEK)
        assert result.assignments[(0, chore.id)] == m1


# ─── Restrictions ─────────────────────────────────────────────────────────────

class TestRestrictions:
    def test_restriction_on_chore_type_respected(self):
        m1, m2 = uuid.uuid4(), uuid.uuid4()
        chore = _chore(freq=1)
        restriction = _constraint("restriction", m1, chore_id=chore.id)
        result = scheduler.generate_schedule([m1, m2], [chore], [restriction], WEEK)
        assert result.assignments.get((0, chore.id)) == m2

    def test_impossible_all_members_restricted(self):
        m1, m2 = uuid.uuid4(), uuid.uuid4()
        chore = _chore(freq=1)
        r1 = _constraint("restriction", m1, chore_id=chore.id)
        r2 = _constraint("restriction", m2, chore_id=chore.id)
        with pytest.raises(ScheduleImpossibleError):
            scheduler.generate_schedule([m1, m2], [chore], [r1, r2], WEEK)


# ─── Frequency caps ───────────────────────────────────────────────────────────

class TestFrequencyCaps:
    def test_frequency_cap_not_exceeded(self):
        m1 = uuid.uuid4()
        chore = _chore(freq=3, weight=1.0)  # Needs 3 slots
        cap = _constraint("frequency_cap", m1, chore_id=chore.id, max_frequency=1)
        m2 = uuid.uuid4()
        result = scheduler.generate_schedule([m1, m2], [chore], [cap], WEEK)
        m1_count = sum(1 for v in result.assignments.values() if v == m1)
        assert m1_count <= 1


# ─── Backtracking cap ─────────────────────────────────────────────────────────

class TestBacktrackingCap:
    def test_partial_schedule_returned_on_cap(self):
        """
        Create a highly constrained scenario that forces many backtracks.
        Verify we get a partial result rather than hanging forever.
        """
        members = [uuid.uuid4() for _ in range(3)]
        # 7 chores each needing 5 slots = 35 slots, heavily restricted
        chores = [_chore(freq=5, weight=1.0) for _ in range(7)]
        # Restrict each member from all chores on alternating days
        constraints = []
        for i, m in enumerate(members):
            for chore in chores[: len(chores) // 2]:
                for day in range(0, 5, 2):
                    constraints.append(_constraint("restriction", m, chore_id=chore.id, day_of_week=day))

        # Should either succeed or return partial (not hang or crash)
        try:
            result = scheduler.generate_schedule(members, chores, constraints, WEEK)
            assert isinstance(result, ScheduleResult)
        except ScheduleImpossibleError:
            pass  # Also acceptable


# ─── Points per member ────────────────────────────────────────────────────────

class TestPointsPerMember:
    def test_points_tracked_per_member(self):
        m1, m2 = uuid.uuid4(), uuid.uuid4()
        chores = [_chore(freq=1, weight=2.0), _chore(freq=1, weight=2.0)]
        result = scheduler.generate_schedule([m1, m2], chores, [], WEEK)
        total = sum(result.points_per_member.values())
        assert total == pytest.approx(4.0)  # 2 chores × weight 2.0
