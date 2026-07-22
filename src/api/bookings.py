from fastapi import APIRouter
from src.api.dependencies import AdminUserDep, CurrentUserDep, DBDep, PaginationDep
from src.schemas.bookings import Booking, BookingAddRequest, BookingSortBy, BookingWithHotel
from src.schemas.common import PaginatedResponse, SortOrder
from src.service.bookings import BookingService

router = APIRouter(prefix="/bookings", tags=["Бронирования"])


@router.get("", response_model=PaginatedResponse[Booking])
async def get_bookings(
    db: DBDep,
    pagination: PaginationDep,
    _: AdminUserDep,
    sort_by: BookingSortBy | None = None,
    sort_order: SortOrder | None = None,
):
    items, total = await BookingService(db).get_bookings(
        pagination.page, pagination.per_page, sort_by, sort_order
    )
    return PaginatedResponse(items=items, total=total, page=pagination.page, per_page=pagination.per_page)


@router.get("/me", response_model=list[BookingWithHotel])
async def get_my_bookings(db: DBDep, user: CurrentUserDep):
    return await BookingService(db).get_my_bookings(user.id)


@router.get("/{booking_id}", response_model=Booking)
async def get_booking(booking_id: int, db: DBDep, user: CurrentUserDep):
    return await BookingService(db).get_booking(booking_id, user)


@router.post("", response_model=Booking, status_code=201)
async def create_booking(booking_data: BookingAddRequest, db: DBDep, user: CurrentUserDep):
    return await BookingService(db).add_booking(booking_data, user.id)


@router.post("/{booking_id}/cancel", response_model=Booking)
async def cancel_booking(booking_id: int, db: DBDep, user: CurrentUserDep):
    return await BookingService(db).cancel_booking(booking_id, user)
