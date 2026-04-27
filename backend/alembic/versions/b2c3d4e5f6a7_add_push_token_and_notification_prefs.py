"""add push_token and notification_prefs to users

Revision ID: b2c3d4e5f6a7
Revises: f1a16f4da2fb
Create Date: 2026-04-27 19:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'f1a16f4da2fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('push_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('notification_prefs', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'notification_prefs')
    op.drop_column('users', 'push_token')
