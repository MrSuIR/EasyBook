from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from src.exceptions import ObjectIntegrityException, ObjectNotFoundException
from src.models import BookingsOrm, ReviewsOrm, RoomsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import ReviewDataMapper
from src.repositories.utils import sort_expression
from src.schemas.common import SortOrder
from src.schemas.reviews import ReviewPatch, ReviewSortBy


class ReviewsRepository(BaseRepository):
    model = ReviewsOrm
    mapper = ReviewDataMapper

    async def get_by_user(self, user_id: int):
        query = (
            select(ReviewsOrm)
            .join(BookingsOrm, BookingsOrm.id == ReviewsOrm.booking_id)
            .where(BookingsOrm.user_id == user_id)
            .order_by(ReviewsOrm.created_at.desc(), ReviewsOrm.id.desc())
        )
        result = await self.session.execute(query)
        return [self.mapper.map_to_domain_entity(item) for item in result.scalars().all()]

    async def get_paginated_by_hotel(
        self, hotel_id: int, limit: int, offset: int, sort_by: ReviewSortBy, sort_order: SortOrder
    ):
        hotel_filter = RoomsOrm.hotel_id == hotel_id
        sort_columns = {
            ReviewSortBy.CREATED_AT: ReviewsOrm.created_at,
            ReviewSortBy.RATING: ReviewsOrm.rating,
        }
        primary_sort = sort_expression(sort_columns[sort_by], sort_order)
        id_sort = sort_expression(ReviewsOrm.id, sort_order)

        query = (
            select(ReviewsOrm)
            .join(BookingsOrm, BookingsOrm.id == ReviewsOrm.booking_id)
            .join(RoomsOrm, RoomsOrm.id == BookingsOrm.room_id)
            .where(hotel_filter)
            .order_by(primary_sort, id_sort)
            .limit(limit)
            .offset(offset)
        )
        count_query = (
            select(func.count(ReviewsOrm.id))
            .join(BookingsOrm, BookingsOrm.id == ReviewsOrm.booking_id)
            .join(RoomsOrm, RoomsOrm.id == BookingsOrm.room_id)
            .where(hotel_filter)
        )
        items = (await self.session.execute(query)).scalars().all()
        total = (await self.session.execute(count_query)).scalar_one()
        return [self.mapper.map_to_domain_entity(item) for item in items], total

    async def exists_for_booking(self, booking_id: int) -> bool:
        query = select(ReviewsOrm.id).where(ReviewsOrm.booking_id == booking_id)
        return (await self.session.execute(query)).scalar_one_or_none() is not None

    async def edit_review(self, review_id: int, data: ReviewPatch):
        values = data.model_dump(exclude_unset=True)
        values["updated_at"] = func.now()
        query = update(ReviewsOrm).where(ReviewsOrm.id == review_id).values(**values).returning(ReviewsOrm)
        try:
            model = (await self.session.execute(query)).scalars().one_or_none()
        except IntegrityError as ex:
            raise ObjectIntegrityException from ex
        if model is None:
            raise ObjectNotFoundException
        return self.mapper.map_to_domain_entity(model)
