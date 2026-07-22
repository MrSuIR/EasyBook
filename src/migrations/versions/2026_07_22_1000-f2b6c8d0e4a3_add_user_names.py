"""add required user names

Revision ID: f2b6c8d0e4a3
Revises: e1a5b7c9d3f2
Create Date: 2026-07-22 10:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "f2b6c8d0e4a3"
down_revision: str | None = "e1a5b7c9d3f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=100), nullable=True))

    # Старые аккаунты не содержат данных, из которых можно восстановить реальные имена.
    op.execute(
        sa.text(
            "UPDATE users SET first_name = 'Не указано', last_name = 'Не указано' "
            "WHERE first_name IS NULL OR last_name IS NULL"
        )
    )

    op.alter_column(
        "users", "first_name", existing_type=sa.String(length=100), nullable=False
    )
    op.alter_column(
        "users", "last_name", existing_type=sa.String(length=100), nullable=False
    )
    op.create_check_constraint(
        "ck_users_first_name_valid",
        "users",
        "char_length(first_name) BETWEEN 1 AND 100 "
        "AND first_name ~ '[^[:space:]]'",
    )
    op.create_check_constraint(
        "ck_users_last_name_valid",
        "users",
        "char_length(last_name) BETWEEN 1 AND 100 "
        "AND last_name ~ '[^[:space:]]'",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_last_name_valid", "users", type_="check")
    op.drop_constraint("ck_users_first_name_valid", "users", type_="check")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
