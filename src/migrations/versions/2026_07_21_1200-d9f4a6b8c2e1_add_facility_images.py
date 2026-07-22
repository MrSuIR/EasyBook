"""add facility images

Revision ID: d9f4a6b8c2e1
Revises: c8e3f5a7b9d1
Create Date: 2026-07-21 12:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "d9f4a6b8c2e1"
down_revision: str | None = "c8e3f5a7b9d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("facilities", sa.Column("image_path", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("facilities", "image_path")
