from datetime import date, datetime, timezone
from sqlalchemy import func, select, update
from src.constants import BookingStatus
from src.exceptions import (
    AllRoomsAreBookedException,
    BookingHasReviewException,
    BookingNotFoundException,
    RoomNotFoundException,
)
from src.models import BookingsOrm, ReviewsOrm, RoomsOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import BookingDataMapper
from src.schemas.bookings import BookingAdd, BookingCreate


class BookingsRepository(BaseRepository):
    model = BookingsOrm
    mapper = BookingDataMapper

    async def get_for_update(self, booking_id: int):
        booking = (
            (
                await self.session.execute(
                    select(BookingsOrm)
                    .where(BookingsOrm.id == booking_id)
                    .with_for_update()
                )
            )
            .scalars()
            .one_or_none()
        )
        if booking is None:
            raise BookingNotFoundException
        return self.mapper.map_to_domain_entity(booking)

    async def get_bookings_with_today_checkin(self):
        result = await self.session.execute(
            select(BookingsOrm).filter(
                BookingsOrm.date_from == date.today(),
                BookingsOrm.status == BookingStatus.CONFIRMED.value,
            )
        )
        return [
            self.mapper.map_to_domain_entity(item) for item in result.scalars().all()
        ]

    async def get_paginated(self, limit: int, offset: int):
        result = await self.session.execute(
            select(BookingsOrm).order_by(BookingsOrm.id).limit(limit).offset(offset)
        )
        return [
            self.mapper.map_to_domain_entity(item) for item in result.scalars().all()
        ], await self.count()

    async def add_booking(self, data: BookingCreate):
        room = (
            (
                await self.session.execute(
                    select(RoomsOrm)
                    .where(RoomsOrm.id == data.room_id)
                    .with_for_update()
                )
            )
            .scalars()
            .one_or_none()
        )
        if room is None:
            raise RoomNotFoundException
        count = (
            await self.session.execute(
                select(func.count(BookingsOrm.id)).where(
                    BookingsOrm.room_id == data.room_id,
                    BookingsOrm.status == BookingStatus.CONFIRMED.value,
                    BookingsOrm.date_from < data.date_to,
                    BookingsOrm.date_to > data.date_from,
                )
            )
        ).scalar_one()
        if count >= room.quantity:
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
        booking = (
            (
                await self.session.execute(
                    select(BookingsOrm)
                    .where(BookingsOrm.id == booking_id)
                    .with_for_update()
                )
            )
            .scalars()
            .one_or_none()
        )
        if booking is None:
            raise BookingNotFoundException
        await self.session.execute(
            select(RoomsOrm).where(RoomsOrm.id == booking.room_id).with_for_update()
        )
        if booking.status == BookingStatus.CANCELLED.value:
            return self.mapper.map_to_domain_entity(booking)
        review_id = (
            await self.session.execute(
                select(ReviewsOrm.id).where(ReviewsOrm.booking_id == booking_id)
            )
        ).scalar_one_or_none()
        if review_id is not None:
            raise BookingHasReviewException
        stmt = (
            update(BookingsOrm)
            .where(BookingsOrm.id == booking_id)
            .values(
                status=BookingStatus.CANCELLED.value,
                cancelled_at=datetime.now(timezone.utc),
            )
            .returning(BookingsOrm)
        )
        return self.mapper.map_to_domain_entity(
            (await self.session.execute(stmt)).scalars().one()
        )
