"""add user profile split tables

Revision ID: bf5fef6b2d3a
Revises: 932bc3c48f1a
Create Date: 2026-04-20 19:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "bf5fef6b2d3a"
down_revision: Union[str, None] = "932bc3c48f1a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("occupation", sa.String(length=100), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=True),
        sa.Column("diet_preference", sa.String(length=30), nullable=True),
        sa.Column("smoking", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("drinking", sa.String(length=20), nullable=False, server_default="social"),
        sa.Column("pet_friendly", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sleep_schedule", sa.String(length=20), nullable=False, server_default="normal"),
        sa.Column("noise_tolerance", sa.String(length=20), nullable=False, server_default="moderate"),
        sa.Column("guest_frequency", sa.String(length=20), nullable=False, server_default="sometimes"),
        sa.Column("cleanliness_level", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("work_schedule", sa.String(length=30), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_user_profiles_user_id"), "user_profiles", ["user_id"], unique=True)

    op.create_table(
        "user_search_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("current_city", sa.String(length=100), nullable=True),
        sa.Column("current_state", sa.String(length=50), nullable=True),
        sa.Column("looking_in", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("budget_min", sa.Integer(), nullable=True),
        sa.Column("budget_max", sa.Integer(), nullable=True),
        sa.Column("move_in_date", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        op.f("ix_user_search_preferences_user_id"),
        "user_search_preferences",
        ["user_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_user_search_preferences_current_city"),
        "user_search_preferences",
        ["current_city"],
        unique=False,
    )

    # Backfill split tables from the legacy columns that still exist on users.
    op.execute(
        """
        INSERT INTO user_profiles (
            id,
            user_id,
            bio,
            occupation,
            date_of_birth,
            gender,
            diet_preference,
            smoking,
            drinking,
            pet_friendly,
            sleep_schedule,
            noise_tolerance,
            guest_frequency,
            cleanliness_level,
            work_schedule
        )
        SELECT
            id,
            id,
            bio,
            occupation,
            date_of_birth,
            gender,
            diet_preference,
            smoking,
            drinking,
            pet_friendly,
            sleep_schedule,
            noise_tolerance,
            guest_frequency,
            cleanliness_level,
            work_schedule
        FROM users
        """
    )

    op.execute(
        """
        INSERT INTO user_search_preferences (
            id,
            user_id,
            current_city,
            current_state,
            looking_in,
            budget_min,
            budget_max,
            move_in_date
        )
        SELECT
            id,
            id,
            current_city,
            current_state,
            looking_in,
            budget_min,
            budget_max,
            move_in_date
        FROM users
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_search_preferences_current_city"), table_name="user_search_preferences")
    op.drop_index(op.f("ix_user_search_preferences_user_id"), table_name="user_search_preferences")
    op.drop_table("user_search_preferences")
    op.drop_index(op.f("ix_user_profiles_user_id"), table_name="user_profiles")
    op.drop_table("user_profiles")
