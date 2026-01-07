from datetime import date
from sqlalchemy import select
from src.exceptions import AllRoomsAreBookedException
from src.models import BookingsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import BookingDataMapper
from src.repositories.utils import rooms_ids_for_booking
from src.schemas.bookings import BookingAdd


class BookingsRepository(BaseRepository):
    model = BookingsOrm
    mapper = BookingDataMapper

    async def get_bookings_with_today_checkin(self):
        query = select(BookingsOrm).filter(BookingsOrm.date_from == date.today())
        result = await self.session.execute(query)
        return [self.mapper.map_to_domain_entity(booking) for booking in result.scalars().all()]

    async def add_booking(self, data: BookingAdd, hotel_id: int):
        rooms_ids_to_get = rooms_ids_for_booking(data.date_from, data.date_to, hotel_id)
        rooms_ids_result = await self.session.execute(rooms_ids_to_get)
        rooms_ids_to_book = rooms_ids_result.scalars().all()

        if data.room_id in rooms_ids_to_book:
            return await self.add(data)
        raise AllRoomsAreBookedException
