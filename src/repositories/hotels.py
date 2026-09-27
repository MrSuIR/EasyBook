from datetime import date
from sqlalchemy import func, or_, select
from src.constants import HotelStatus
from src.models import HotelsOrm, RoomsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import HotelDataMapper
from src.repositories.utils import rooms_ids_for_booking, sort_expression
from src.schemas.common import SortOrder
from src.schemas.hotels import HotelSortBy


class HotelsRepository(BaseRepository):
    model = HotelsOrm
    mapper = HotelDataMapper

    async def get_for_update(self, hotel_id: int):
        query = select(self.model).where(self.model.id == hotel_id).with_for_update()
        model = (await self.session.execute(query)).scalars().one_or_none()
        if model is None:
            from src.exceptions import ObjectNotFoundException

            raise ObjectNotFoundException
        return self.mapper.map_to_domain_entity(model)

    async def get_paginated(
        self,
        limit: int,
        offset: int,
        sort_by: HotelSortBy,
        sort_order: SortOrder,
        title: str | None = None,
        location: str | None = None,
        status: HotelStatus | None = None,
    ):
        query = select(HotelsOrm)
        if status is not None:
            query = query.where(HotelsOrm.status == status.value)
        if title:
            query = query.where(HotelsOrm.title.ilike(f"%{title}%"))
        if location:
            query = query.where(HotelsOrm.location.ilike(f"%{location}%"))

        total = (
            await self.session.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()
        sort_columns = {
            HotelSortBy.ID: HotelsOrm.id,
            HotelSortBy.TITLE: HotelsOrm.title,
            HotelSortBy.LOCATION: HotelsOrm.location,
        }
        query = query.order_by(sort_expression(sort_columns[sort_by], sort_order))
        if sort_by != HotelSortBy.ID:
            query = query.order_by(sort_expression(HotelsOrm.id, sort_order))
        result = await self.session.execute(query.limit(limit).offset(offset))
        return [self.mapper.map_to_domain_entity(item) for item in result.scalars().all()], total

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

        query = select(HotelsOrm).filter(
            HotelsOrm.id.in_(hotels_ids), HotelsOrm.status == HotelStatus.ACTIVE.value
        )
        if location:
            city, separator, _ = location.partition(",")
            full_location_match = HotelsOrm.location.ilike(f"%{location}%")
            if separator and city.strip():
                query = query.filter(
                    or_(full_location_match, HotelsOrm.location.ilike(city.strip()))
                )
            else:
                query = query.filter(full_location_match)
        if title:
            query = query.filter(HotelsOrm.title.ilike(f"%{title}%"))
        total = (await self.session.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        sort_columns = {
            HotelSortBy.ID: HotelsOrm.id,
            HotelSortBy.TITLE: HotelsOrm.title,
            HotelSortBy.LOCATION: HotelsOrm.location,
        }
        primary_sort = sort_expression(sort_columns[sort_by], sort_order)
        query = query.order_by(primary_sort)

        if sort_by != HotelSortBy.ID:
            id_sort = sort_expression(HotelsOrm.id, sort_order)
            query = query.order_by(id_sort)

        query = query.limit(limit).offset(offset)
        result = await self.session.execute(query)
        return [self.mapper.map_to_domain_entity(hotel) for hotel in result.scalars().all()], total
