"""add service_bookings table

Revision ID: d4e5f6a7b8c9
Revises: b2c3d4e5f6a7
Create Date: 2026-04-27 20:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'service_bookings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('service_providers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scheduled_date', sa.Date(), nullable=False),
        sa.Column('time_slot', sa.String(20), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('rescheduled_date', sa.Date(), nullable=True),
        sa.Column('rescheduled_time_slot', sa.String(20), nullable=True),
        sa.Column('reschedule_reason', sa.Text(), nullable=True),
        sa.Column('cancel_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index('ix_service_bookings_user_id', 'service_bookings', ['user_id'])
    op.create_index('ix_service_bookings_provider_id', 'service_bookings', ['provider_id'])


def downgrade() -> None:
    op.drop_index('ix_service_bookings_provider_id', 'service_bookings')
    op.drop_index('ix_service_bookings_user_id', 'service_bookings')
    op.drop_table('service_bookings')
