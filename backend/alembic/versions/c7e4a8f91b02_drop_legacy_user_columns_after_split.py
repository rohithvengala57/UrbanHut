"""drop legacy user columns after split

Revision ID: c7e4a8f91b02
Revises: 93a9495f72f1
Create Date: 2026-04-20 21:00:00.000000

Data was already migrated to user_profiles / user_search_preferences in bf5fef6b2d3a.
This migration removes the now-redundant columns from the users table, completing the split.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c7e4a8f91b02"
down_revision: Union[str, None] = "93a9495f72f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Columns now owned by user_profiles
_PROFILE_COLS = [
    "bio",
    "occupation",
    "date_of_birth",
    "gender",
    "diet_preference",
    "smoking",
    "drinking",
    "pet_friendly",
    "sleep_schedule",
    "noise_tolerance",
    "guest_frequency",
    "cleanliness_level",
    "work_schedule",
]

# Columns now owned by user_search_preferences
_PREFS_COLS = [
    "current_city",
    "current_state",
    "looking_in",
    "budget_min",
    "budget_max",
    "move_in_date",
]


def upgrade() -> None:
    # Drop the index that was on the legacy current_city column
    op.drop_index("ix_users_current_city", table_name="users", if_exists=True)

    for col in _PROFILE_COLS + _PREFS_COLS:
        op.drop_column("users", col)


def downgrade() -> None:
    # Restore profile columns (nullable to avoid constraint violations)
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("occupation", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("gender", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("diet_preference", sa.String(length=30), nullable=True))
    op.add_column(
        "users",
        sa.Column("smoking", sa.Boolean(), nullable=True, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("drinking", sa.String(length=20), nullable=True, server_default="social"),
    )
    op.add_column(
        "users",
        sa.Column("pet_friendly", sa.Boolean(), nullable=True, server_default=sa.text("true")),
    )
    op.add_column(
        "users",
        sa.Column("sleep_schedule", sa.String(length=20), nullable=True, server_default="normal"),
    )
    op.add_column(
        "users",
        sa.Column("noise_tolerance", sa.String(length=20), nullable=True, server_default="moderate"),
    )
    op.add_column(
        "users",
        sa.Column("guest_frequency", sa.String(length=20), nullable=True, server_default="sometimes"),
    )
    op.add_column(
        "users",
        sa.Column("cleanliness_level", sa.Integer(), nullable=True, server_default="3"),
    )
    op.add_column("users", sa.Column("work_schedule", sa.String(length=30), nullable=True))

    # Restore search preference columns
    op.add_column(
        "users",
        sa.Column("current_city", sa.String(length=100), nullable=True),
    )
    op.create_index("ix_users_current_city", "users", ["current_city"], unique=False)
    op.add_column("users", sa.Column("current_state", sa.String(length=50), nullable=True))
    op.add_column(
        "users",
        sa.Column("looking_in", postgresql.ARRAY(sa.String()), nullable=True),
    )
    op.add_column("users", sa.Column("budget_min", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("budget_max", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("move_in_date", sa.Date(), nullable=True))

    # Backfill from split tables
    op.execute(
        """
        UPDATE users u
        SET
            bio          = p.bio,
            occupation   = p.occupation,
            date_of_birth = p.date_of_birth,
            gender       = p.gender,
            diet_preference = p.diet_preference,
            smoking      = p.smoking,
            drinking     = p.drinking,
            pet_friendly = p.pet_friendly,
            sleep_schedule = p.sleep_schedule,
            noise_tolerance = p.noise_tolerance,
            guest_frequency = p.guest_frequency,
            cleanliness_level = p.cleanliness_level,
            work_schedule = p.work_schedule
        FROM user_profiles p
        WHERE p.user_id = u.id
        """
    )
    op.execute(
        """
        UPDATE users u
        SET
            current_city  = s.current_city,
            current_state = s.current_state,
            looking_in    = s.looking_in,
            budget_min    = s.budget_min,
            budget_max    = s.budget_max,
            move_in_date  = s.move_in_date
        FROM user_search_preferences s
        WHERE s.user_id = u.id
        """
    )
