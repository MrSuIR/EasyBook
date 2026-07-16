from datetime import date
from sqlalchemy import select, func

from src.exceptions import DateValuesException
from src.constants import BookingStatus
from src.models import BookingsOrm, RoomsOrm
from src.schemas.common import SortOrder


def sort_expression(column, sort_order: SortOrder):
    if sort_order == SortOrder.ASC:
        return column.asc()
    return column.desc()


def rooms_ids_for_booking(date_from: date, date_to: date, hotel_id: int | None = None):
    if date_from >= date_to:
        raise DateValuesException

    booking_is_confirmed = BookingsOrm.status == BookingStatus.CONFIRMED.value
    booking_starts_before_requested_checkout = BookingsOrm.date_from < date_to
    booking_ends_after_requested_checkin = BookingsOrm.date_to > date_from

    booked_rooms = (
        select(BookingsOrm.room_id, func.count("*").label("rooms_booked_count"))
        .select_from(BookingsOrm)
        .filter(
            booking_is_confirmed,
            booking_starts_before_requested_checkout,
            booking_ends_after_requested_checkin,
        )
        .group_by(BookingsOrm.room_id)
        .cte(name="booked_rooms")
    )

    available_rooms_count = RoomsOrm.quantity - func.coalesce(booked_rooms.c.rooms_booked_count, 0)
    rooms_with_availability = (
        select(RoomsOrm.id.label("room_id"), available_rooms_count.label("rooms_left_count"))
        .select_from(RoomsOrm)
        .outerjoin(booked_rooms, RoomsOrm.id == booked_rooms.c.room_id)
        .cte(name="rooms_with_availability")
    )

    rooms_ids_for_hotel = select(RoomsOrm.id).select_from(RoomsOrm)

    if hotel_id:
        rooms_ids_for_hotel = rooms_ids_for_hotel.where(RoomsOrm.hotel_id == hotel_id)

    rooms_ids_to_get = (
        select(rooms_with_availability.c.room_id)
        .select_from(rooms_with_availability)
        .where(
            rooms_with_availability.c.rooms_left_count > 0,
            rooms_with_availability.c.room_id.in_(rooms_ids_for_hotel),
        )
    )

    return rooms_ids_to_get
