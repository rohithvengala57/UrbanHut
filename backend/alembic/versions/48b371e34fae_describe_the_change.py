"""describe the change

Revision ID: 48b371e34fae
Revises: bf5fef6b2d3a
Create Date: 2026-04-20 15:14:02.058141

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '48b371e34fae'
down_revision: Union[str, None] = 'bf5fef6b2d3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
