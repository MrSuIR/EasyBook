from fastapi import APIRouter
from src import DBDep, UserIdDep
from src import BookingAddRequest, BookingAdd

router = APIRouter(prefix="/bookings", tags=["Бронирования"])

@router.get("")
async def get_bookings(db: DBDep):
    return await db.bookings.get_all()


@router.get("/me")
async def get_my_bookings(db: DBDep, user_id: UserIdDep):
    return await db.bookings.get_filtered(user_id=user_id)


@router.post("")
async def create_booking(
        booking_data: BookingAddRequest,
        db: DBDep,
        user_id: UserIdDep
):
    room = await db.rooms.get_one_or_none(id=booking_data.room_id)
    room_price = room.price
    data = BookingAdd(price=room_price, **booking_data.model_dump(), user_id=user_id)
    booking = await db.bookings.add(data=data)
    await db.commit()
    return {"status": "OK", "data": booking}