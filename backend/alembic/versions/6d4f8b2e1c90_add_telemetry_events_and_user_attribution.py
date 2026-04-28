"""add telemetry events and user attribution tables

Revision ID: 6d4f8b2e1c90
Revises: 458cb23029fb
Create Date: 2026-04-27 21:18:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "6d4f8b2e1c90"
down_revision: Union[str, None] = "458cb23029fb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_attribution",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_touch", sa.JSON(), nullable=True),
        sa.Column("last_touch", sa.JSON(), nullable=True),
        sa.Column("first_touch_source", sa.String(length=100), nullable=True),
        sa.Column("first_touch_medium", sa.String(length=100), nullable=True),
        sa.Column("first_touch_campaign", sa.String(length=200), nullable=True),
        sa.Column("first_touch_city", sa.String(length=120), nullable=True),
        sa.Column("last_touch_source", sa.String(length=100), nullable=True),
        sa.Column("last_touch_medium", sa.String(length=100), nullable=True),
        sa.Column("last_touch_campaign", sa.String(length=200), nullable=True),
        sa.Column("last_touch_city", sa.String(length=120), nullable=True),
        sa.Column("first_touch_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_touch_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signup_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_activation_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_user_attribution_user_id"), "user_attribution", ["user_id"], unique=True)
    op.create_index(op.f("ix_user_attribution_signup_at"), "user_attribution", ["signup_at"], unique=False)
    op.create_index(
        op.f("ix_user_attribution_first_activation_at"),
        "user_attribution",
        ["first_activation_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_attribution_first_touch_source"),
        "user_attribution",
        ["first_touch_source"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_attribution_first_touch_medium"),
        "user_attribution",
        ["first_touch_medium"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_attribution_first_touch_campaign"),
        "user_attribution",
        ["first_touch_campaign"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_attribution_last_touch_source"),
        "user_attribution",
        ["last_touch_source"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_attribution_last_touch_medium"),
        "user_attribution",
        ["last_touch_medium"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_attribution_last_touch_campaign"),
        "user_attribution",
        ["last_touch_campaign"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_attribution_first_touch_city"),
        "user_attribution",
        ["first_touch_city"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_attribution_last_touch_city"),
        "user_attribution",
        ["last_touch_city"],
        unique=False,
    )

    op.create_table(
        "telemetry_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_name", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("session_id", sa.String(length=128), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("utm_source", sa.String(length=100), nullable=True),
        sa.Column("utm_medium", sa.String(length=100), nullable=True),
        sa.Column("utm_campaign", sa.String(length=200), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("first_touch", sa.JSON(), nullable=True),
        sa.Column("last_touch", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_telemetry_events_user_id"), "telemetry_events", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_telemetry_events_household_id"),
        "telemetry_events",
        ["household_id"],
        unique=False,
    )
    op.create_index(op.f("ix_telemetry_events_event_name"), "telemetry_events", ["event_name"], unique=False)
    op.create_index(op.f("ix_telemetry_events_source"), "telemetry_events", ["source"], unique=False)
    op.create_index(op.f("ix_telemetry_events_session_id"), "telemetry_events", ["session_id"], unique=False)
    op.create_index(op.f("ix_telemetry_events_occurred_at"), "telemetry_events", ["occurred_at"], unique=False)
    op.create_index(op.f("ix_telemetry_events_event_date"), "telemetry_events", ["event_date"], unique=False)
    op.create_index(op.f("ix_telemetry_events_utm_source"), "telemetry_events", ["utm_source"], unique=False)
    op.create_index(op.f("ix_telemetry_events_utm_medium"), "telemetry_events", ["utm_medium"], unique=False)
    op.create_index(
        op.f("ix_telemetry_events_utm_campaign"),
        "telemetry_events",
        ["utm_campaign"],
        unique=False,
    )
    op.create_index(op.f("ix_telemetry_events_city"), "telemetry_events", ["city"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_telemetry_events_city"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_utm_campaign"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_utm_medium"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_utm_source"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_event_date"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_occurred_at"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_session_id"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_source"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_event_name"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_household_id"), table_name="telemetry_events")
    op.drop_index(op.f("ix_telemetry_events_user_id"), table_name="telemetry_events")
    op.drop_table("telemetry_events")

    op.drop_index(op.f("ix_user_attribution_last_touch_city"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_first_touch_city"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_last_touch_campaign"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_last_touch_medium"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_last_touch_source"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_first_touch_campaign"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_first_touch_medium"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_first_touch_source"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_first_activation_at"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_signup_at"), table_name="user_attribution")
    op.drop_index(op.f("ix_user_attribution_user_id"), table_name="user_attribution")
    op.drop_table("user_attribution")
