from fastapi import APIRouter
from src.api.dependencies import DBDep, UserIdDep
from src.exceptions import AllRoomsAreBookedException, AllRoomsAreBookedHTTPException
from src.schemas.bookings import BookingAddRequest
from src.service.bookings import BookingService

router = APIRouter(prefix="/bookings", tags=["Бронирования"])


@router.get("")
async def get_bookings(db: DBDep):
    return await BookingService(db).get_bookings()


@router.get("/me")
async def get_my_bookings(db: DBDep, user_id: UserIdDep):
    return await BookingService(db).get_my_bookings(user_id=user_id)


@router.post("")
async def create_booking(booking_data: BookingAddRequest, db: DBDep, user_id: UserIdDep, hotel_id: int):
    try:
        booking = await BookingService(db).add_booking(booking_data=booking_data, user_id=user_id, hotel_id=hotel_id)
    except AllRoomsAreBookedException:
        raise AllRoomsAreBookedHTTPException
    return {"status": "OK", "data": booking}
