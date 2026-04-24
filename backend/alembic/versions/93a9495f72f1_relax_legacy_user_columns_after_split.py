"""relax legacy user columns after split

Revision ID: 93a9495f72f1
Revises: 2d6c5b9f7a11
Create Date: 2026-04-20 20:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "93a9495f72f1"
down_revision: Union[str, None] = "2d6c5b9f7a11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # These columns were split out to user_profiles/user_search_preferences,
    # but the legacy users table still enforces old NOT NULL constraints.
    # Relax them so inserts through the new model no longer fail.
    op.alter_column("users", "smoking", existing_type=sa.Boolean(), nullable=True, server_default=sa.text("false"))
    op.alter_column("users", "drinking", existing_type=sa.String(length=20), nullable=True, server_default="social")
    op.alter_column("users", "pet_friendly", existing_type=sa.Boolean(), nullable=True, server_default=sa.text("true"))
    op.alter_column("users", "sleep_schedule", existing_type=sa.String(length=20), nullable=True, server_default="normal")
    op.alter_column("users", "noise_tolerance", existing_type=sa.String(length=20), nullable=True, server_default="moderate")
    op.alter_column("users", "guest_frequency", existing_type=sa.String(length=20), nullable=True, server_default="sometimes")
    op.alter_column("users", "cleanliness_level", existing_type=sa.Integer(), nullable=True, server_default="3")


def downgrade() -> None:
    op.alter_column("users", "cleanliness_level", existing_type=sa.Integer(), nullable=False, server_default=None)
    op.alter_column("users", "guest_frequency", existing_type=sa.String(length=20), nullable=False, server_default=None)
    op.alter_column("users", "noise_tolerance", existing_type=sa.String(length=20), nullable=False, server_default=None)
    op.alter_column("users", "sleep_schedule", existing_type=sa.String(length=20), nullable=False, server_default=None)
    op.alter_column("users", "pet_friendly", existing_type=sa.Boolean(), nullable=False, server_default=None)
    op.alter_column("users", "drinking", existing_type=sa.String(length=20), nullable=False, server_default=None)
    op.alter_column("users", "smoking", existing_type=sa.Boolean(), nullable=False, server_default=None)
