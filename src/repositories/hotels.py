from datetime import date
from sqlalchemy import func, select
from src.models import HotelsOrm, RoomsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import HotelDataMapper
from src.repositories.utils import rooms_ids_for_booking
from src.schemas.common import SortOrder
from src.schemas.hotels import HotelSortBy


class HotelsRepository(BaseRepository):
    model = HotelsOrm
    mapper = HotelDataMapper

    async def get_filtered_by_time(
        self,
        date_from: date,
        date_to: date,
        limit: int,
        offset: int,
        sort_by: HotelSortBy,
        sort_order: SortOrder,
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
        total = (
            await self.session.execute(
                select(func.count()).select_from(query.subquery())
            )
        ).scalar_one()
        sort_column = {
            HotelSortBy.ID: HotelsOrm.id,
            HotelSortBy.TITLE: HotelsOrm.title,
            HotelSortBy.LOCATION: HotelsOrm.location,
        }[sort_by]
        order = sort_column.asc if sort_order == SortOrder.ASC else sort_column.desc
        query = query.order_by(order())
        if sort_by != HotelSortBy.ID:
            id_order = HotelsOrm.id.asc if sort_order == SortOrder.ASC else HotelsOrm.id.desc
            query = query.order_by(id_order())
        query = query.limit(limit).offset(offset)
        result = await self.session.execute(query)
        return [
            self.mapper.map_to_domain_entity(hotel) for hotel in result.scalars().all()
        ], total
