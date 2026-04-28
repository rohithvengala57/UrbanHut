"""merge heads before adding referral fields

Revision ID: 42ac2f586f5c
Revises: a1b2c3d4e5f6, d4e5f6a7b8c9
Create Date: 2026-04-27 16:52:48.976480

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '42ac2f586f5c'
down_revision: Union[str, None] = ('a1b2c3d4e5f6', 'd4e5f6a7b8c9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
