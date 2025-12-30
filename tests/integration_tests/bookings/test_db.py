from datetime import date

from src.schemas.bookings import BookingAdd

async def test_booking_crud(db, ac):
    user_id = (await db.users.get_all())[0].id
    room_id = (await db.rooms.get_all())[0].id
    booking_data = BookingAdd(
        user_id=user_id,
        room_id=room_id,
        date_from=date(year=2025, month=11, day=25),
        date_to=date(year=2025, month=11, day=30),
        price=100,
    )
    new_booking = await db.bookings.add(booking_data)

    booking = await db.bookings.get_one_or_none(id=new_booking.id)
    assert booking
    assert booking.id == booking.id
    assert booking.room_id == booking.room_id
    assert booking.user_id == booking.user_id

    update_booking_data = BookingAdd(
        user_id=user_id,
        room_id=room_id,
        date_from=date(year=2025, month=11, day=25),
        date_to=date(year=2025, month=11, day=30),
        price=500,
    )
    await db.bookings.edit(update_booking_data, id=booking.id)
    updated_booking = await db.bookings.get_one_or_none(id=booking.id)
    assert updated_booking
    assert updated_booking.id == booking.id
    assert updated_booking.room_id == booking.room_id
    assert updated_booking.user_id == booking.user_id
    assert updated_booking.price == update_booking_data.price

    await db.bookings.delete(id=booking.id)
    delete_booking = await db.bookings.get_filtered(id=booking.id)
    assert not delete_booking

