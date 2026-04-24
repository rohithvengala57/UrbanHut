"""
Compatibility Score: 0-100%

Scoring:
- Each lifestyle dimension: weighted match score (max 80)
- Budget compatibility: overlap ratio × 10 (max 10)
- Trust score similarity × 10 (max 10)
"""

from app.models.user import User

LIFESTYLE_WEIGHTS = {
    "diet_preference": 8,
    "smoking": 10,
    "drinking": 5,
    "sleep_schedule": 12,
    "noise_tolerance": 10,
    "guest_frequency": 8,
    "cleanliness_level": 15,
    "work_schedule": 7,
    "pet_friendly": 5,
}

BUDGET_WEIGHT = 10
TRUST_WEIGHT = 10

# Partial compatibility maps
COMPATIBLE_VALUES = {
    "drinking": {("social", "never"), ("never", "social")},
    "sleep_schedule": {("normal", "early_bird"), ("early_bird", "normal")},
    "noise_tolerance": {("moderate", "quiet"), ("quiet", "moderate"), ("moderate", "loud_ok"), ("loud_ok", "moderate")},
    "guest_frequency": {("sometimes", "rarely"), ("rarely", "sometimes"), ("sometimes", "often"), ("often", "sometimes")},
}


class MatchingEngine:
    def calculate_compatibility(self, seeker: User, target: User) -> dict:
        lifestyle_score = self._lifestyle_match(seeker, target)
        budget_score = self._budget_match(seeker, target)
        trust_score = self._trust_match(seeker, target)

        total = lifestyle_score + budget_score + trust_score

        return {
            "total_score": round(total, 1),
            "lifestyle_score": round(lifestyle_score, 1),
            "budget_score": round(budget_score, 1),
            "trust_score": round(trust_score, 1),
            "breakdown": self._get_breakdown(seeker, target),
        }

    def _lifestyle_match(self, a: User, b: User) -> float:
        score = 0.0
        for dim, weight in LIFESTYLE_WEIGHTS.items():
            val_a = getattr(a, dim, None)
            val_b = getattr(b, dim, None)

            if val_a is None or val_b is None:
                score += weight * 0.5  # Unknown = neutral
            elif dim == "cleanliness_level":
                diff = abs(int(val_a) - int(val_b))
                if diff == 0:
                    score += weight
                elif diff == 1:
                    score += weight * 0.7
                elif diff == 2:
                    score += weight * 0.3
            elif dim in ("smoking", "pet_friendly"):
                if val_a == val_b:
                    score += weight
            elif val_a == val_b:
                score += weight
            elif self._is_compatible(dim, val_a, val_b):
                score += weight * 0.5
        return score

    def _is_compatible(self, dim: str, val_a, val_b) -> bool:
        if dim in COMPATIBLE_VALUES:
            return (str(val_a), str(val_b)) in COMPATIBLE_VALUES[dim]
        return False

    def _budget_match(self, a: User, b: User) -> float:
        if not (a.budget_min and a.budget_max and b.budget_min and b.budget_max):
            return BUDGET_WEIGHT * 0.5

        overlap = min(a.budget_max, b.budget_max) - max(a.budget_min, b.budget_min)
        total_range = max(a.budget_max, b.budget_max) - min(a.budget_min, b.budget_min)

        if total_range <= 0:
            return 0.0

        ratio = max(0, overlap / total_range)
        return ratio * BUDGET_WEIGHT

    def _trust_match(self, a: User, b: User) -> float:
        trust_a = float(a.trust_score) if a.trust_score else 0
        trust_b = float(b.trust_score) if b.trust_score else 0

        diff = abs(trust_a - trust_b)
        avg = (trust_a + trust_b) / 2

        # Higher average trust = bonus, large gap = penalty
        similarity = max(0, 1 - diff / 100)
        avg_bonus = avg / 100

        return (similarity * 0.6 + avg_bonus * 0.4) * TRUST_WEIGHT

    def _get_breakdown(self, a: User, b: User) -> dict:
        breakdown = {}
        for dim, weight in LIFESTYLE_WEIGHTS.items():
            val_a = getattr(a, dim, None)
            val_b = getattr(b, dim, None)

            if val_a is None or val_b is None:
                match_level = "unknown"
            elif dim == "cleanliness_level":
                diff = abs(int(val_a) - int(val_b))
                match_level = "perfect" if diff == 0 else "good" if diff == 1 else "fair" if diff == 2 else "poor"
            elif dim in ("smoking", "pet_friendly"):
                match_level = "perfect" if val_a == val_b else "mismatch"
            elif val_a == val_b:
                match_level = "perfect"
            elif self._is_compatible(dim, val_a, val_b):
                match_level = "compatible"
            else:
                match_level = "mismatch"

            breakdown[dim] = {
                "weight": weight,
                "match": match_level,
                "yours": str(val_a) if val_a is not None else None,
                "theirs": str(val_b) if val_b is not None else None,
            }
        return breakdown
