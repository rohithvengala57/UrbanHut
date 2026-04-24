"""add_verification_metadata_fields

Revision ID: 8f9d8a1a3c21
Revises: 7594dd2881bf
Create Date: 2026-04-15 18:55:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "8f9d8a1a3c21"
down_revision: Union[str, None] = "7594dd2881bf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("verifications", sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True))
    op.add_column("verifications", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("verifications", sa.Column("review_notes", sa.Text(), nullable=True))
    op.add_column("verifications", sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("verifications", "metadata")
    op.drop_column("verifications", "review_notes")
    op.drop_column("verifications", "reviewed_at")
    op.drop_column("verifications", "submitted_at")
