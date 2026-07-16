from datetime import date

from src.constants import BookingStatus
from src.exceptions import (
    BookingNotFoundException,
    ForbiddenException,
    HotelNotFoundException,
    ObjectAlreadyExistException,
    ObjectNotFoundException,
    ReviewAlreadyExistsException,
    ReviewNotAllowedException,
    ReviewNotFoundException,
)
from src.schemas.common import SortOrder
from src.schemas.reviews import ReviewAdd, ReviewCreate, ReviewPatch, ReviewSortBy
from src.schemas.users import User
from src.service.base import BaseService


class ReviewService(BaseService):
    async def get_hotel_reviews(
        self,
        hotel_id: int,
        page: int,
        per_page: int,
        sort_by: ReviewSortBy | None = None,
        sort_order: SortOrder | None = None,
    ):
        try:
            await self.db.hotels.get_one(id=hotel_id)
        except ObjectNotFoundException as ex:
            raise HotelNotFoundException from ex
        return await self.db.reviews.get_paginated_by_hotel(
            hotel_id=hotel_id,
            limit=per_page,
            offset=per_page * (page - 1),
            sort_by=sort_by or ReviewSortBy.CREATED_AT,
            sort_order=sort_order or SortOrder.DESC,
        )

    async def get_my_reviews(self, user_id: int):
        return await self.db.reviews.get_by_user(user_id)

    async def get_review(self, review_id: int, actor: User):
        review = await self._get_review(review_id)
        booking = await self._get_booking(review.booking_id)
        self._check_owner(booking.user_id, actor.id)
        return review

    async def add_review(self, data: ReviewCreate, actor: User):
        booking = await self.db.bookings.get_for_update(data.booking_id)
        self._check_owner(booking.user_id, actor.id)

        booking_is_confirmed = booking.status == BookingStatus.CONFIRMED
        stay_is_completed = date.today() >= booking.date_to
        if not booking_is_confirmed or not stay_is_completed:
            raise ReviewNotAllowedException

        try:
            review = await self.db.reviews.add(
                ReviewAdd(booking_id=data.booking_id, rating=data.rating, comment=data.comment)
            )
        except ObjectAlreadyExistException as ex:
            raise ReviewAlreadyExistsException from ex
        await self.db.commit()
        return review

    async def edit_review(self, review_id: int, data: ReviewPatch, actor: User):
        await self.get_review(review_id, actor)
        try:
            review = await self.db.reviews.edit_review(review_id, data)
        except ObjectNotFoundException as ex:
            raise ReviewNotFoundException from ex
        await self.db.commit()
        return review

    async def delete_review(self, review_id: int, actor: User):
        review = await self._get_review(review_id)
        booking = await self.db.bookings.get_for_update(review.booking_id)
        self._check_owner(booking.user_id, actor.id)
        try:
            await self.db.reviews.delete(id=review_id)
        except ObjectNotFoundException as ex:
            raise ReviewNotFoundException from ex
        await self.db.commit()

    async def _get_review(self, review_id: int):
        try:
            return await self.db.reviews.get_one(id=review_id)
        except ObjectNotFoundException as ex:
            raise ReviewNotFoundException from ex

    async def _get_booking(self, booking_id: int):
        try:
            return await self.db.bookings.get_one(id=booking_id)
        except ObjectNotFoundException as ex:
            raise BookingNotFoundException from ex

    @staticmethod
    def _check_owner(owner_id: int, actor_id: int):
        if owner_id != actor_id:
            raise ForbiddenException
