from datetime import date
from sqlalchemy import select, func
from src.models import BookingsOrm, RoomsOrm


def rooms_ids_for_booking(date_from: date, date_to: date, hotel_id: int | None = None):
    rooms_booked_table = (
        select(BookingsOrm.room_id, func.count("*").label("rooms_booked_count"))
        .select_from(BookingsOrm)
        .filter(BookingsOrm.date_from <= date_to, BookingsOrm.date_to >= date_from)
        .group_by(BookingsOrm.room_id)
        .cte(name="rooms_booked_table")
    )

    rooms_left_table = (
        select(
            RoomsOrm.id.label("room_id"),
            (RoomsOrm.quantity - func.coalesce(rooms_booked_table.c.rooms_booked_count, 0)).label(
                "rooms_left_count"
            ),
        )
        .select_from(RoomsOrm)
        .outerjoin(rooms_booked_table, RoomsOrm.id == rooms_booked_table.c.room_id)
        .cte(name="rooms_left_table")
    )

    rooms_ids_for_hotel = select(RoomsOrm.id).select_from(RoomsOrm)

    if hotel_id:
        rooms_ids_for_hotel = rooms_ids_for_hotel.where(RoomsOrm.hotel_id == hotel_id)

    rooms_ids_to_get = (
        select(rooms_left_table.c.room_id)
        .select_from(rooms_left_table)
        .where(
            rooms_left_table.c.rooms_left_count > 0,
            rooms_left_table.c.room_id.in_(rooms_ids_for_hotel),
        )
    )

    return rooms_ids_to_get
