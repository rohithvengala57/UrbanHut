"""
Constraint-Satisfaction Chore Scheduler

Algorithm: Greedy assignment with backtracking
1. Sort constraints by priority (fixed > restriction > frequency > preference)
2. Pre-assign all fixed constraints
3. For each remaining slot (day × chore), assign to person with:
   a. No restriction violation
   b. Lowest current total points (fairness)
   c. Preference bonus if applicable
   d. Not exceeding frequency cap
4. If stuck, backtrack and try next-best candidate
5. Return schedule + points + fairness_score
"""

import uuid
from dataclasses import dataclass, field
from datetime import date

import structlog
from app.models.chore import ChoreConstraint, ChoreTemplate

log = structlog.get_logger("app.services.chore_scheduler")
MAX_BACKTRACKS = 10_000  # Safety cap to prevent request timeouts


class ScheduleImpossibleError(Exception):
    pass


class ScheduleTimeoutError(Exception):
    """Raised when the backtracking limit is hit. Returns best-so-far."""
    pass


@dataclass
class ScheduleResult:
    assignments: dict  # (day, chore_id) -> user_id
    points_per_member: dict[uuid.UUID, float]
    fairness_score: float
    partial: bool = False  # True if returned before all constraints were satisfied


class ChoreScheduler:
    def generate_schedule(
        self,
        members: list[uuid.UUID],
        chores: list[ChoreTemplate],
        constraints: list[ChoreConstraint],
        week_start: date,
    ) -> ScheduleResult:
        log.info(
            "chore_schedule_generation_started",
            member_count=len(members),
            chore_count=len(chores),
            constraint_count=len(constraints),
            week_start=str(week_start),
        )

        if not members or not chores:
            log.warning(
                "chore_schedule_skipped",
                reason="no_members_or_chores",
                member_count=len(members),
                chore_count=len(chores),
            )
            return ScheduleResult(assignments={}, points_per_member={}, fairness_score=1.0)

        # Only use active chores
        active_chores = [c for c in chores if getattr(c, "is_active", True)]
        if not active_chores:
            log.warning(
                "chore_schedule_skipped",
                reason="all_chores_inactive",
                total_chores=len(chores),
            )
            return ScheduleResult(assignments={}, points_per_member={m: 0.0 for m in members}, fairness_score=1.0)

        fixed = [c for c in constraints if c.type == "fixed_assignment" and c.status == "approved"]
        restrictions = [c for c in constraints if c.type == "restriction" and c.status == "approved"]
        preferences = [c for c in constraints if c.type == "preference" and c.status == "approved"]
        freq_caps = [c for c in constraints if c.type == "frequency_cap" and c.status == "approved"]

        schedule: dict[tuple[int, uuid.UUID], uuid.UUID] = {}
        points: dict[uuid.UUID, float] = {m: 0.0 for m in members}
        freq_count: dict[uuid.UUID, dict[uuid.UUID, int]] = {m: {} for m in members}

        chore_map = {c.id: c for c in active_chores}

        # Step 1: Apply fixed assignments
        for f in fixed:
            if f.chore_id and f.user_id and f.day_of_week is not None:
                if f.chore_id not in chore_map:
                    continue  # Skip fixed assignments for inactive chores
                key = (f.day_of_week, f.chore_id)
                schedule[key] = f.user_id
                weight = float(chore_map[f.chore_id].weight)
                points[f.user_id] = points.get(f.user_id, 0) + weight
                freq_count.setdefault(f.user_id, {})
                freq_count[f.user_id][f.chore_id] = freq_count[f.user_id].get(f.chore_id, 0) + 1

        # Step 2: Build remaining slots — spread across the week evenly
        slots = []
        for chore in active_chores:
            days_needed = min(chore.frequency, 7)
            # Distribute slots evenly across Mon–Sun (0–6)
            if days_needed >= 7:
                chosen_days = list(range(7))
            else:
                # Spread days by splitting 0-6 into equal-ish intervals
                step = 7 / days_needed
                chosen_days = sorted(set(int(i * step) for i in range(days_needed)))
                # Pad with extras if rounding reduced count
                while len(chosen_days) < days_needed:
                    for d in range(7):
                        if d not in chosen_days:
                            chosen_days.append(d)
                            break
                chosen_days.sort()

            for day in chosen_days:
                key = (day, chore.id)
                if key not in schedule:
                    slots.append((day, chore.id, float(chore.weight)))

        # Sort by weight descending (assign hardest chores first)
        slots.sort(key=lambda s: -s[2])

        # Step 3: Greedy assign with bounded backtracking
        backtrack_count = [0]
        best_so_far: dict[tuple[int, uuid.UUID], uuid.UUID] = {}

        success = self._assign(
            slots, 0, schedule, points, freq_count,
            members, chore_map, restrictions, preferences, freq_caps,
            backtrack_count, best_so_far,
        )

        if not success and not best_so_far:
            log.error(
                "chore_schedule_impossible",
                member_count=len(members),
                active_chore_count=len(active_chores),
                slot_count=len(slots),
                fixed_constraints=len(fixed),
                restrictions=len(restrictions),
                backtracks=backtrack_count[0],
            )
            raise ScheduleImpossibleError("Cannot satisfy all constraints")

        final_schedule = schedule if success else best_so_far
        final_partial = not success

        if final_partial:
            log.warning(
                "chore_schedule_partial",
                reason="backtrack_limit_reached",
                max_backtracks=MAX_BACKTRACKS,
                slots_assigned=len(final_schedule),
                slots_total=len(slots),
            )

        # Calculate fairness: 1 means perfectly equal, 0 means all chores on one person
        point_values = [points.get(m, 0.0) for m in members]
        max_pts = max(point_values) if point_values else 0
        min_pts = min(point_values) if point_values else 0
        if max_pts == 0:
            fairness = 1.0
        else:
            fairness = 1.0 - (max_pts - min_pts) / max_pts

        result = ScheduleResult(
            assignments=final_schedule,
            points_per_member=points,
            fairness_score=round(max(0.0, fairness), 3),
            partial=final_partial,
        )
        log.info(
            "chore_schedule_generation_complete",
            week_start=str(week_start),
            assignments_count=len(final_schedule),
            fairness_score=result.fairness_score,
            partial=final_partial,
            backtracks=backtrack_count[0],
            points_per_member={str(k): round(v, 2) for k, v in points.items()},
        )
        return result

    def _assign(
        self, slots, idx, schedule, points, freq_count,
        members, chore_map, restrictions, preferences, freq_caps,
        backtrack_count: list[int],
        best_so_far: dict,
    ) -> bool:
        if idx == len(slots):
            return True

        # Record best partial solution seen so far
        if len(schedule) > len(best_so_far):
            best_so_far.clear()
            best_so_far.update(schedule)

        day, chore_id, weight = slots[idx]
        candidates = sorted(members, key=lambda m: points[m])

        # Apply preference bonus — preferred person jumps to front
        for pref in preferences:
            if pref.day_of_week == day and pref.chore_id == chore_id and pref.user_id in candidates:
                candidates.remove(pref.user_id)
                candidates.insert(0, pref.user_id)

        for member in candidates:
            if self._is_valid(member, day, chore_id, restrictions, freq_count, freq_caps):
                schedule[(day, chore_id)] = member
                points[member] += weight
                freq_count.setdefault(member, {})
                freq_count[member][chore_id] = freq_count[member].get(chore_id, 0) + 1

                if self._assign(
                    slots, idx + 1, schedule, points, freq_count,
                    members, chore_map, restrictions, preferences, freq_caps,
                    backtrack_count, best_so_far,
                ):
                    return True

                # Backtrack
                del schedule[(day, chore_id)]
                points[member] -= weight
                freq_count[member][chore_id] -= 1

                backtrack_count[0] += 1
                if backtrack_count[0] >= MAX_BACKTRACKS:
                    return False

        return False

    def _is_valid(
        self, member, day, chore_id, restrictions, freq_count, freq_caps
    ) -> bool:
        # Check restrictions
        for r in restrictions:
            if r.user_id == member:
                if r.chore_id == chore_id and r.day_of_week is None:
                    return False  # User can't do this chore at all
                if r.day_of_week == day and r.chore_id is None:
                    return False  # User can't work this day
                if r.chore_id == chore_id and r.day_of_week == day:
                    return False  # User can't do this chore on this day

        # Check frequency caps
        for fc in freq_caps:
            if fc.user_id == member and fc.chore_id == chore_id and fc.max_frequency is not None:
                current = freq_count.get(member, {}).get(chore_id, 0)
                if current >= fc.max_frequency:
                    return False

        return True
