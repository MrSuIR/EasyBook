from datetime import date
from sqlalchemy import func, select
from src.models import HotelsOrm, RoomsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import HotelDataMapper
from src.repositories.utils import rooms_ids_for_booking


class HotelsRepository(BaseRepository):
    model = HotelsOrm
    mapper = HotelDataMapper

    async def get_filtered_by_time(
        self,
        date_from: date,
        date_to: date,
        limit: int,
        offset: int,
        title: str | None = None,
        location: str | None = None,
    ):
        rooms_ids_to_get = rooms_ids_for_booking(date_from, date_to)
        hotels_ids = select(RoomsOrm.hotel_id).where(RoomsOrm.id.in_(rooms_ids_to_get))

        query = select(HotelsOrm).filter(HotelsOrm.id.in_(hotels_ids))
        if location:
            query = query.filter(HotelsOrm.location.ilike(f"%{location}%"))
        if title:
            query = query.filter_by(title=title)
        query = query.limit(limit).offset(offset)
        total = (
            await self.session.execute(
                select(func.count()).select_from(query.order_by(None).subquery())
            )
        ).scalar_one()
        result = await self.session.execute(query)
        return [
            self.mapper.map_to_domain_entity(hotel) for hotel in result.scalars().all()
        ], total
