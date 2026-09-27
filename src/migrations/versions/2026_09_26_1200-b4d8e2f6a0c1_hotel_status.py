"""add hotel status

Revision ID: b4d8e2f6a0c1
Revises: a3c7e9f1b5d2
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "b4d8e2f6a0c1"
down_revision: str | None = "a3c7e9f1b5d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "hotels",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
    )
    op.create_check_constraint(
        "ck_hotels_status", "hotels", "status IN ('active', 'archived')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_hotels_status", "hotels", type_="check")
    op.drop_column("hotels", "status")
