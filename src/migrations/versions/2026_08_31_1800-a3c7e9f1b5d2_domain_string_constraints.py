"""add database constraints for public domain strings

Revision ID: a3c7e9f1b5d2
Revises: f2b6c8d0e4a3
Create Date: 2026-08-31 18:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "a3c7e9f1b5d2"
down_revision: str | None = "f2b6c8d0e4a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _count(query: str) -> int:
    return op.get_bind().execute(sa.text(query)).scalar_one()


def _validate_existing_data() -> None:
    invalid = {
        "hotels": _count(
            "SELECT count(*) FROM hotels WHERE "
            "char_length(title) NOT BETWEEN 1 AND 100 OR title !~ '[^[:space:]]' OR "
            "char_length(location) NOT BETWEEN 1 AND 500 OR location !~ '[^[:space:]]'"
        ),
        "rooms": _count(
            "SELECT count(*) FROM rooms WHERE "
            "char_length(title) NOT BETWEEN 1 AND 200 OR title !~ '[^[:space:]]'"
        ),
        "facilities": _count(
            "SELECT count(*) FROM facilities WHERE "
            "char_length(title) NOT BETWEEN 1 AND 100 OR title !~ '[^[:space:]]'"
        ),
        "bookings": _count("SELECT count(*) FROM bookings WHERE price < 0"),
        "user_emails": _count(
            "SELECT count(*) FROM users WHERE char_length(email) NOT BETWEEN 3 AND 320 "
            "OR email <> lower(btrim(email))"
        ),
    }
    if any(invalid.values()):
        details = ", ".join(f"{name}={count}" for name, count in invalid.items())
        raise RuntimeError(
            "Миграция остановлена: найдены значения, нарушающие ограничения "
            f"предметной области ({details}). Исправьте перечисленные записи "
            "вручную и повторите upgrade."
        )


def upgrade() -> None:
    _validate_existing_data()

    op.alter_column(
        "hotels", "location", existing_type=sa.String(), type_=sa.String(length=500)
    )
    op.alter_column(
        "rooms", "title", existing_type=sa.String(), type_=sa.String(length=200)
    )
    op.alter_column(
        "facilities", "title", existing_type=sa.String(), type_=sa.String(length=100)
    )

    op.create_check_constraint(
        "ck_hotels_title_valid",
        "hotels",
        "char_length(title) BETWEEN 1 AND 100 AND title ~ '[^[:space:]]'",
    )
    op.create_check_constraint(
        "ck_hotels_location_valid",
        "hotels",
        "char_length(location) BETWEEN 1 AND 500 AND location ~ '[^[:space:]]'",
    )
    op.create_check_constraint(
        "ck_rooms_title_valid",
        "rooms",
        "char_length(title) BETWEEN 1 AND 200 AND title ~ '[^[:space:]]'",
    )
    op.create_check_constraint(
        "ck_facilities_title_valid",
        "facilities",
        "char_length(title) BETWEEN 1 AND 100 AND title ~ '[^[:space:]]'",
    )
    op.create_check_constraint(
        "ck_bookings_price_nonnegative", "bookings", "price >= 0"
    )
    op.create_check_constraint(
        "ck_users_email_normalized",
        "users",
        "char_length(email) BETWEEN 3 AND 320 AND email = lower(btrim(email))",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_email_normalized", "users", type_="check")
    op.drop_constraint("ck_bookings_price_nonnegative", "bookings", type_="check")
    op.drop_constraint("ck_facilities_title_valid", "facilities", type_="check")
    op.drop_constraint("ck_rooms_title_valid", "rooms", type_="check")
    op.drop_constraint("ck_hotels_location_valid", "hotels", type_="check")
    op.drop_constraint("ck_hotels_title_valid", "hotels", type_="check")

    op.alter_column(
        "facilities", "title", existing_type=sa.String(length=100), type_=sa.String()
    )
    op.alter_column(
        "rooms", "title", existing_type=sa.String(length=200), type_=sa.String()
    )
    op.alter_column(
        "hotels", "location", existing_type=sa.String(length=500), type_=sa.String()
    )
