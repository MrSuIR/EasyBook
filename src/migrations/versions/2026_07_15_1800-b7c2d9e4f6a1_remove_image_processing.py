"""remove asynchronous image processing state

Revision ID: b7c2d9e4f6a1
Revises: a8f1d3c4e5b6
Create Date: 2026-07-15 18:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "b7c2d9e4f6a1"
down_revision: str | None = "a8f1d3c4e5b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_hotel_images_status", "hotel_images", type_="check")
    op.drop_column("hotel_images", "status")


def downgrade() -> None:
    op.add_column(
        "hotel_images", sa.Column("status", sa.String(length=20), server_default="ready", nullable=False)
    )
    op.create_check_constraint(
        "ck_hotel_images_status", "hotel_images", "status IN ('processing', 'ready', 'failed')"
    )
    op.alter_column("hotel_images", "status", server_default="processing")
