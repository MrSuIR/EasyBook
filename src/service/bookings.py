from src.constants import UserRole
from src.exceptions import BookingNotFoundException, ForbiddenException, ObjectNotFoundException
from src.schemas.bookings import BookingAddRequest, BookingCreate, BookingSortBy
from src.schemas.common import SortOrder
from src.schemas.users import User
from src.service.base import BaseService


class BookingService(BaseService):
    async def get_bookings(
        self,
        page: int,
        per_page: int,
        sort_by: BookingSortBy | None = None,
        sort_order: SortOrder | None = None,
    ):
        return await self.db.bookings.get_paginated(
            limit=per_page,
            offset=per_page * (page - 1),
            sort_by=sort_by or BookingSortBy.ID,
            sort_order=sort_order or SortOrder.ASC,
        )

    async def get_my_bookings(self, user_id: int):
        return await self.db.bookings.get_filtered(user_id=user_id)

    async def get_booking(self, booking_id: int, actor: User):
        try:
            booking = await self.db.bookings.get_one(id=booking_id)
        except ObjectNotFoundException as ex:
            raise BookingNotFoundException from ex
        self._check_access(booking.user_id, actor)
        return booking

    async def add_booking(self, data: BookingAddRequest, user_id: int):
        booking = await self.db.bookings.add_booking(BookingCreate(user_id=user_id, **data.model_dump()))
        await self.db.commit()
        return booking

    async def cancel_booking(self, booking_id: int, actor: User):
        await self.get_booking(booking_id, actor)
        result = await self.db.bookings.cancel(booking_id)
        await self.db.commit()
        return result

    @staticmethod
    def _check_access(owner_id: int, actor: User):
        if actor.role != UserRole.ADMIN and actor.id != owner_id:
            raise ForbiddenException
