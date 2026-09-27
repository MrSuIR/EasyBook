from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import selectinload

from src.constants import BookingStatus
from src.exceptions import ObjectNotFoundException
from src.models import BookingsOrm, RoomsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import RoomDataMapper, RoomDataWithRelsMapper
from src.repositories.utils import rooms_ids_for_booking


class RoomsRepository(BaseRepository):
    model = RoomsOrm
    mapper = RoomDataMapper

    async def get_for_update(self, room_id: int, hotel_id: int):
        query = select(self.model).where(self.model.id == room_id, self.model.hotel_id == hotel_id).with_for_update()
        model = (await self.session.execute(query)).scalars().one_or_none()
        if model is None:
            raise ObjectNotFoundException
        return self.mapper.map_to_domain_entity(model)

    async def get_current_and_future_confirmed_intervals(self, room_id: int, today: date):
        query = select(BookingsOrm.date_from, BookingsOrm.date_to).where(
            BookingsOrm.room_id == room_id,
            BookingsOrm.status == BookingStatus.CONFIRMED.value,
            BookingsOrm.date_to > today,
        )
        return (await self.session.execute(query)).all()

    async def get_all_for_hotel(self, hotel_id: int):
        query = (
            select(self.model)
            .options(selectinload(self.model.facilities))
            .where(RoomsOrm.hotel_id == hotel_id)
            .order_by(RoomsOrm.id.asc())
        )
        result = await self.session.execute(query)
        return [RoomDataWithRelsMapper.map_to_domain_entity(model) for model in result.scalars().all()]

    async def get_filtered_by_time(self, date_from: date, date_to: date, hotel_id: int):
        rooms_ids_to_get = rooms_ids_for_booking(date_from, date_to, hotel_id)

        query = (
            select(self.model)
            .options(selectinload(self.model.facilities))
            .filter(RoomsOrm.id.in_(rooms_ids_to_get))
        )

        result = await self.session.execute(query)
        return [RoomDataWithRelsMapper.map_to_domain_entity(model) for model in result.scalars().all()]

    async def get_room_with_rels(self, room_id: int, hotel_id: int):
        query = (
            select(self.model)
            .options(selectinload(self.model.facilities))
            .where(RoomsOrm.id == room_id, RoomsOrm.hotel_id == hotel_id)
        )
        result = await self.session.execute(query)
        try:
            model = result.scalars().one()
        except NoResultFound:
            raise ObjectNotFoundException
        return RoomDataWithRelsMapper.map_to_domain_entity(model)
