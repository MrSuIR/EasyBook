from datetime import date
from sqlalchemy import select
from src.models import HotelsOrm, RoomsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import HotelDataMapper
from src.repositories.utils import rooms_ids_for_booking


class HotelsRepository(BaseRepository):
    model = HotelsOrm
    mapper = HotelDataMapper

    async def get_filtered_by_time(
        self,
        date_from: date | None,
        date_to: date | None,
        limit: int,
        offset: int,
        title: str | None = None,
        location: str | None = None,
    ):
        # If dates are provided, filter by availability
        if date_from and date_to:
            rooms_ids_to_get = rooms_ids_for_booking(date_from, date_to)
            hotels_ids = select(RoomsOrm.hotel_id).where(RoomsOrm.id.in_(rooms_ids_to_get))
            query = select(HotelsOrm).filter(HotelsOrm.id.in_(hotels_ids))
        else:
            # No date filtering - show all hotels
            query = select(HotelsOrm)

        if location:
            query = query.filter(HotelsOrm.location.ilike(f"%{location}%"))
        if title:
            query = query.filter_by(title=title)
        query = query.limit(limit).offset(offset)
        result = await self.session.execute(query)

        return [self.mapper.map_to_domain_entity(hotel) for hotel in result.scalars().all()]
