"""add community replies and upvote dedup

Revision ID: a3e7f1c2d4b9
Revises: 8f9d8a1a3c21
Create Date: 2026-04-16 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a3e7f1c2d4b9"
down_revision: Union[str, None] = "8f9d8a1a3c21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add reply_count to community_posts
    op.add_column(
        "community_posts",
        sa.Column("reply_count", sa.Integer(), nullable=False, server_default="0"),
    )

    # Create community_replies table
    op.create_table(
        "community_replies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("community_posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_community_replies_post_id", "community_replies", ["post_id"])

    # Create community_post_upvotes table for deduplication
    op.create_table(
        "community_post_upvotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("community_posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_unique_constraint(
        "uq_post_upvote_user",
        "community_post_upvotes",
        ["post_id", "user_id"],
    )


def downgrade() -> None:
    op.drop_table("community_post_upvotes")
    op.drop_index("ix_community_replies_post_id", table_name="community_replies")
    op.drop_table("community_replies")
    op.drop_column("community_posts", "reply_count")
