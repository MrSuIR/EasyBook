"""require room descriptions

Revision ID: e1a5b7c9d3f2
Revises: d9f4a6b8c2e1
Create Date: 2026-07-21 15:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "e1a5b7c9d3f2"
down_revision: str | None = "d9f4a6b8c2e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _validate_existing_descriptions() -> None:
    missing, blank, too_long = (
        op.get_bind()
        .execute(
            sa.text(
                """
            SELECT
                count(*) FILTER (WHERE description IS NULL),
                count(*) FILTER (
                    WHERE description IS NOT NULL
                    AND description !~ '[^[:space:]]'
                ),
                count(*) FILTER (WHERE char_length(description) > 500)
            FROM rooms
            """
            )
        )
        .one()
    )
    if missing or blank or too_long:
        raise RuntimeError(
            "Миграция остановлена: найдены некорректные описания типов номеров "
            f"(null={missing}, blank={blank}, longer_than_500={too_long}). "
            "Заполните обязательные описания вручную, сократите их до 500 "
            "символов и повторите upgrade."
        )


def upgrade() -> None:
    _validate_existing_descriptions()
    op.alter_column(
        "rooms", "description", existing_type=sa.String(), type_=sa.String(length=500), nullable=False
    )
    op.create_check_constraint(
        "ck_rooms_description_valid",
        "rooms",
        "char_length(description) BETWEEN 1 AND 500 AND description ~ '[^[:space:]]'",
    )


def downgrade() -> None:
    op.drop_constraint("ck_rooms_description_valid", "rooms", type_="check")
    op.alter_column(
        "rooms", "description", existing_type=sa.String(length=500), type_=sa.String(), nullable=True
    )
