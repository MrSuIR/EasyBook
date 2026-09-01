from datetime import datetime, timezone
from sqlalchemy import func, select, update
from src.constants import BookingStatus
from src.exceptions import (
    AllRoomsAreBookedException,
    BookingCancellationClosedException,
    BookingHasReviewException,
    BookingNotFoundException,
    RoomNotFoundException,
)
from src.models import BookingsOrm, ReviewsOrm, RoomsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import BookingDataMapper
from src.repositories.utils import sort_expression
from src.schemas.bookings import BookingAdd, BookingCreate, BookingSortBy, BookingWithHotel
from src.schemas.common import SortOrder
from src.utils.time import local_today


class BookingsRepository(BaseRepository):
    model = BookingsOrm
    mapper = BookingDataMapper

    async def get_for_user_with_hotels(self, user_id: int):
        query = (
            select(BookingsOrm, RoomsOrm.hotel_id)
            .join(RoomsOrm, RoomsOrm.id == BookingsOrm.room_id)
            .where(BookingsOrm.user_id == user_id)
        )
        result = await self.session.execute(query)
        return [
            BookingWithHotel(
                **self.mapper.map_to_domain_entity(booking).model_dump(),
                hotel_id=hotel_id,
            )
            for booking, hotel_id in result.all()
        ]

    async def get_for_update(self, booking_id: int):
        booking = await self._get_locked_booking(booking_id)
        if booking is None:
            raise BookingNotFoundException
        return self.mapper.map_to_domain_entity(booking)

    async def get_bookings_with_today_checkin(self):
        result = await self.session.execute(
            select(BookingsOrm).filter(
                BookingsOrm.date_from == local_today(),
                BookingsOrm.status == BookingStatus.CONFIRMED.value,
            )
        )
        return [self.mapper.map_to_domain_entity(item) for item in result.scalars().all()]

    async def get_paginated(self, limit: int, offset: int, sort_by: BookingSortBy, sort_order: SortOrder):
        sort_columns = {
            BookingSortBy.ID: BookingsOrm.id,
            BookingSortBy.DATE_FROM: BookingsOrm.date_from,
            BookingSortBy.DATE_TO: BookingsOrm.date_to,
            BookingSortBy.PRICE: BookingsOrm.price,
            BookingSortBy.STATUS: BookingsOrm.status,
        }
        primary_sort = sort_expression(sort_columns[sort_by], sort_order)
        query = select(BookingsOrm).order_by(primary_sort)

        if sort_by != BookingSortBy.ID:
            id_sort = sort_expression(BookingsOrm.id, sort_order)
            query = query.order_by(id_sort)

        result = await self.session.execute(query.limit(limit).offset(offset))
        return [self.mapper.map_to_domain_entity(item) for item in result.scalars().all()], await self.count()

    async def add_booking(self, data: BookingCreate):
        room_query = select(RoomsOrm).where(RoomsOrm.id == data.room_id).with_for_update()
        room = (await self.session.execute(room_query)).scalars().one_or_none()
        if room is None:
            raise RoomNotFoundException

        booking_is_confirmed = BookingsOrm.status == BookingStatus.CONFIRMED.value
        booking_starts_before_checkout = BookingsOrm.date_from < data.date_to
        booking_ends_after_checkin = BookingsOrm.date_to > data.date_from
        overlapping_bookings_query = select(func.count(BookingsOrm.id)).where(
            BookingsOrm.room_id == data.room_id,
            booking_is_confirmed,
            booking_starts_before_checkout,
            booking_ends_after_checkin,
        )
        overlapping_bookings_count = (await self.session.execute(overlapping_bookings_query)).scalar_one()

        if overlapping_bookings_count >= room.quantity:
            raise AllRoomsAreBookedException

        return await self.add(
            BookingAdd(
                room_id=data.room_id,
                user_id=data.user_id,
                date_from=data.date_from,
                date_to=data.date_to,
                price=room.price,
            )
        )

    async def cancel(self, booking_id: int):
        booking = await self._get_locked_booking(booking_id)
        if booking is None:
            raise BookingNotFoundException

        await self.session.execute(select(RoomsOrm).where(RoomsOrm.id == booking.room_id).with_for_update())

        if booking.status == BookingStatus.CANCELLED.value:
            return self.mapper.map_to_domain_entity(booking)

        review_id = (
            await self.session.execute(select(ReviewsOrm.id).where(ReviewsOrm.booking_id == booking_id))
        ).scalar_one_or_none()
        if review_id is not None:
            raise BookingHasReviewException

        if local_today() >= booking.date_from:
            raise BookingCancellationClosedException

        stmt = (
            update(BookingsOrm)
            .where(BookingsOrm.id == booking_id)
            .values(status=BookingStatus.CANCELLED.value, cancelled_at=datetime.now(timezone.utc))
            .returning(BookingsOrm)
        )
        return self.mapper.map_to_domain_entity((await self.session.execute(stmt)).scalars().one())

    async def _get_locked_booking(self, booking_id: int):
        query = select(BookingsOrm).where(BookingsOrm.id == booking_id).with_for_update()
        return (await self.session.execute(query)).scalars().one_or_none()
