"""add reviews

Revision ID: c8e3f5a7b9d1
Revises: b7c2d9e4f6a1
Create Date: 2026-07-15 21:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "c8e3f5a7b9d1"
down_revision: str | None = "b7c2d9e4f6a1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.String(length=2000), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "char_length(comment) BETWEEN 1 AND 2000 "
            "AND comment ~ '[^[:space:]]'",
            name="ck_reviews_comment_valid",
        ),
        sa.CheckConstraint(
            "rating BETWEEN 1 AND 5", name="ck_reviews_rating_range"
        ),
        sa.ForeignKeyConstraint(
            ["booking_id"], ["bookings.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_id", name="uq_reviews_booking_id"),
    )


def downgrade() -> None:
    op.drop_table("reviews")
