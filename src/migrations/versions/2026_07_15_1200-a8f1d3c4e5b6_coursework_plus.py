"""coursework plus schema

Revision ID: a8f1d3c4e5b6
Revises: 42f7849f3211
Create Date: 2026-07-15 12:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a8f1d3c4e5b6"
down_revision: str | None = "42f7849f3211"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _foreign_key_name(table: str, columns: list[str]) -> str | None:
    for constraint in sa.inspect(op.get_bind()).get_foreign_keys(table):
        if constraint.get("constrained_columns") == columns:
            name = constraint.get("name")
            return name if isinstance(name, str) else None
    return None


def _validate_existing_data() -> None:
    bind = op.get_bind()
    invalid_rooms = bind.execute(
        sa.text("SELECT count(*) FROM rooms WHERE price < 0 OR quantity <= 0")
    ).scalar_one()
    invalid_bookings = bind.execute(
        sa.text("SELECT count(*) FROM bookings WHERE date_from >= date_to")
    ).scalar_one()
    if invalid_rooms or invalid_bookings:
        raise RuntimeError(
            "Миграция остановлена: найдены некорректные данные "
            f"(rooms={invalid_rooms}, bookings={invalid_bookings}). "
            "Исправьте их вручную и повторите upgrade."
        )


def upgrade() -> None:
    _validate_existing_data()

    uniques = sa.inspect(op.get_bind()).get_unique_constraints("users")
    email_unique = next(
        (item for item in uniques if item.get("column_names") == ["email"]), None
    )
    if email_unique and email_unique.get("name") != "uq_users_email":
        name = email_unique.get("name")
        if isinstance(name, str):
            op.drop_constraint(name, "users", type_="unique")
        op.create_unique_constraint("uq_users_email", "users", ["email"])

    op.add_column(
        "users",
        sa.Column(
            "role", sa.String(length=20), server_default="client", nullable=False
        ),
    )
    op.create_check_constraint("ck_users_role", "users", "role IN ('client', 'admin')")

    op.add_column(
        "bookings",
        sa.Column(
            "status", sa.String(length=20), server_default="confirmed", nullable=False
        ),
    )
    op.add_column(
        "bookings",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.add_column(
        "bookings", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_check_constraint(
        "ck_bookings_date_order", "bookings", "date_from < date_to"
    )
    op.create_check_constraint(
        "ck_bookings_status",
        "bookings",
        "status IN ('confirmed', 'cancelled')",
    )
    op.create_index("ix_bookings_user_id", "bookings", ["user_id"])
    op.create_index(
        "ix_bookings_room_status_dates",
        "bookings",
        ["room_id", "status", "date_from", "date_to"],
    )

    op.create_check_constraint("ck_rooms_price_nonnegative", "rooms", "price >= 0")
    op.create_check_constraint("ck_rooms_quantity_positive", "rooms", "quantity > 0")
    op.create_index("ix_rooms_hotel_id", "rooms", ["hotel_id"])

    op.execute(
        sa.text(
            "DELETE FROM rooms_facilities a USING rooms_facilities b "
            "WHERE a.room_id = b.room_id AND a.facility_id = b.facility_id "
            "AND a.id > b.id"
        )
    )
    op.create_unique_constraint(
        "uq_rooms_facilities_pair", "rooms_facilities", ["room_id", "facility_id"]
    )

    for table, column, target, ondelete in (
        ("rooms_facilities", "room_id", "rooms.id", "CASCADE"),
        ("rooms_facilities", "facility_id", "facilities.id", "CASCADE"),
        ("rooms", "hotel_id", "hotels.id", "RESTRICT"),
        ("bookings", "room_id", "rooms.id", "RESTRICT"),
        ("bookings", "user_id", "users.id", "RESTRICT"),
    ):
        old_name = _foreign_key_name(table, [column])
        if old_name:
            op.drop_constraint(old_name, table, type_="foreignkey")
        op.create_foreign_key(
            f"fk_{table}_{column}",
            table,
            target.split(".")[0],
            [column],
            [target.split(".")[1]],
            ondelete=ondelete,
        )

    op.create_table(
        "hotel_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("hotel_id", sa.Integer(), nullable=False),
        sa.Column("original_path", sa.String(length=500), nullable=False),
        sa.Column(
            "status", sa.String(length=20), server_default="processing", nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('processing', 'ready', 'failed')",
            name="ck_hotel_images_status",
        ),
        sa.ForeignKeyConstraint(["hotel_id"], ["hotels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_hotel_images_hotel_id", "hotel_images", ["hotel_id"])


def downgrade() -> None:
    op.drop_index("ix_hotel_images_hotel_id", table_name="hotel_images")
    op.drop_table("hotel_images")

    for table, column, target in (
        ("rooms_facilities", "room_id", "rooms.id"),
        ("rooms_facilities", "facility_id", "facilities.id"),
        ("rooms", "hotel_id", "hotels.id"),
        ("bookings", "room_id", "rooms.id"),
        ("bookings", "user_id", "users.id"),
    ):
        name = _foreign_key_name(table, [column])
        if name:
            op.drop_constraint(name, table, type_="foreignkey")
        op.create_foreign_key(
            None,
            table,
            target.split(".")[0],
            [column],
            [target.split(".")[1]],
        )

    op.drop_constraint("uq_rooms_facilities_pair", "rooms_facilities", type_="unique")
    op.drop_index("ix_rooms_hotel_id", table_name="rooms")
    op.drop_constraint("ck_rooms_quantity_positive", "rooms", type_="check")
    op.drop_constraint("ck_rooms_price_nonnegative", "rooms", type_="check")

    op.drop_index("ix_bookings_room_status_dates", table_name="bookings")
    op.drop_index("ix_bookings_user_id", table_name="bookings")
    op.drop_constraint("ck_bookings_status", "bookings", type_="check")
    op.drop_constraint("ck_bookings_date_order", "bookings", type_="check")
    op.drop_column("bookings", "cancelled_at")
    op.drop_column("bookings", "created_at")
    op.drop_column("bookings", "status")

    op.drop_constraint("ck_users_role", "users", type_="check")
    op.drop_column("users", "role")
