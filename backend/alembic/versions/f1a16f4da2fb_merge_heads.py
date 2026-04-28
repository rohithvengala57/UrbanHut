"""merge_heads

Revision ID: f1a16f4da2fb
Revises: 5944f679ee83, c7e4a8f91b02
Create Date: 2026-04-26 01:07:32.712034

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a16f4da2fb'
down_revision: Union[str, None] = ('5944f679ee83', 'c7e4a8f91b02')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
