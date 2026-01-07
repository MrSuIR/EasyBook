from src.schemas.bookings import BookingAddRequest, BookingAdd
from src.service.base import BaseService
from src.service.hotels import HotelService
from src.service.rooms import RoomService


class BookingService(BaseService):
    async def get_bookings(self):
        return await self.db.bookings.get_all()

    async def get_my_bookings(self, user_id: int):
        return await self.db.bookings.get_filtered(user_id=user_id)

    async def add_booking(self, booking_data: BookingAddRequest, user_id: int, hotel_id: int):
        await HotelService(self.db).check_hotel_exist(hotel_id=hotel_id)
        room = await RoomService(self.db).check_room_exist(room_id=booking_data.room_id, hotel_id=hotel_id)
        room_price = room.price
        data = BookingAdd(price=room_price, **booking_data.model_dump(), user_id=user_id)
        booking = await self.db.bookings.add_booking(data=data, hotel_id=hotel_id)
        await self.db.commit()
        return booking