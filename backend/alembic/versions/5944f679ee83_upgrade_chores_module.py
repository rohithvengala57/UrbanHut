"""upgrade_chores_module

Revision ID: 5944f679ee83
Revises: 93a9495f72f1
Create Date: 2026-04-20 19:01:45.278450

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5944f679ee83'
down_revision: Union[str, None] = '93a9495f72f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # chore_assignments — new columns
    op.add_column('chore_assignments', sa.Column('completed_by', sa.UUID(), nullable=True))
    op.add_column('chore_assignments', sa.Column('note', sa.Text(), nullable=True))
    op.add_column('chore_assignments', sa.Column('admin_verified', sa.Boolean(), nullable=False,
                                                  server_default=sa.text('false')))
    op.create_foreign_key(
        'fk_chore_assignments_completed_by',
        'chore_assignments', 'users',
        ['completed_by'], ['id'],
        ondelete='SET NULL',
    )

    # chore_templates — new columns
    op.add_column('chore_templates', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('chore_templates', sa.Column('category', sa.String(length=50), nullable=True))
    op.add_column('chore_templates', sa.Column('is_active', sa.Boolean(), nullable=False,
                                               server_default=sa.text('true')))


def downgrade() -> None:
    op.drop_column('chore_templates', 'is_active')
    op.drop_column('chore_templates', 'category')
    op.drop_column('chore_templates', 'description')
    op.drop_constraint('fk_chore_assignments_completed_by', 'chore_assignments', type_='foreignkey')
    op.drop_column('chore_assignments', 'admin_verified')
    op.drop_column('chore_assignments', 'note')
    op.drop_column('chore_assignments', 'completed_by')
