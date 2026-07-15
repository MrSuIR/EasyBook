from datetime import date
from fastapi import APIRouter
from src.api.dependencies import AdminUserDep, DBDep, PaginationDep
from src.schemas.common import PaginatedResponse
from src.schemas.hotels import Hotel, HotelAdd, HotelPatch
from src.service.hotels import HotelService

router = APIRouter(prefix="/hotels", tags=["Отели"])


@router.get("", response_model=PaginatedResponse[Hotel])
async def get_hotels(
    pagination: PaginationDep,
    db: DBDep,
    date_from: date,
    date_to: date,
    title: str | None = None,
    location: str | None = None,
):
    items, total = await HotelService(db).get_hotels(
        page=pagination.page,
        per_page=pagination.per_page,
        date_from=date_from,
        date_to=date_to,
        title=title,
        location=location,
    )
    return PaginatedResponse(
        items=items, total=total, page=pagination.page, per_page=pagination.per_page
    )


@router.get("/{hotel_id}", response_model=Hotel)
async def get_hotel(hotel_id: int, db: DBDep):
    return await HotelService(db).get_hotel(hotel_id)


@router.post("", response_model=Hotel, status_code=201)
async def create_hotel(hotel_data: HotelAdd, db: DBDep, _: AdminUserDep):
    return await HotelService(db).add_hotel(hotel_data)


@router.put("/{hotel_id}")
async def edit_hotel(hotel_id: int, hotel_data: HotelAdd, db: DBDep, _: AdminUserDep):
    await HotelService(db).edit_hotel(hotel_id, hotel_data)
    return {"status": "OK"}


@router.patch("/{hotel_id}")
async def patch_hotel(
    hotel_id: int, hotel_data: HotelPatch, db: DBDep, _: AdminUserDep
):
    await HotelService(db).edit_hotel(hotel_id, hotel_data, exclude_unset=True)
    return {"status": "OK"}


@router.delete("/{hotel_id}")
async def delete_hotel(hotel_id: int, db: DBDep, _: AdminUserDep):
    await HotelService(db).delete_hotel(hotel_id)
    return {"status": "OK"}
