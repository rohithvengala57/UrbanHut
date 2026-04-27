"""add referral and onboarding fields to users

Revision ID: 458cb23029fb
Revises: 42ac2f586f5c
Create Date: 2026-04-27 16:52:56.400908

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '458cb23029fb'
down_revision: Union[str, None] = '42ac2f586f5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('referral_code', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('referred_by_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('users', sa.Column('onboarding_metadata', sa.JSON(), nullable=True))
    op.create_unique_constraint('uq_users_referral_code', 'users', ['referral_code'])
    op.create_foreign_key('fk_users_referred_by', 'users', 'users', ['referred_by_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_users_referred_by', 'users', type_='foreignkey')
    op.drop_constraint('uq_users_referral_code', 'users', type_='unique')
    op.drop_column('users', 'onboarding_metadata')
    op.drop_column('users', 'referred_by_id')
    op.drop_column('users', 'referral_code')
