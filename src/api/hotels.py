from datetime import date
from fastapi import APIRouter, HTTPException
from fastapi_cache.decorator import cache
from src.api.dependencies import PaginationDep, DBDep
from src.exceptions import DateValuesException, ObjectNotFoundException, HotelNotFoundHTTPException
from src.schemas.hotels import HotelAdd, HotelPatch
from src.service.hotels import HotelService

router = APIRouter(prefix="/hotels", tags=["Отели"])


@router.get("")
@cache(expire=10)
async def get_hotels(
    pagination: PaginationDep,
    db: DBDep,
    date_from: date,
    date_to: date,
    title: str | None = None,
    location: str | None = None,
):
    try:
        return await HotelService(db).get_hotels(date_from=date_from, date_to=date_to, title=title, location=location, pagination=pagination)
    except DateValuesException:
        raise HTTPException(status_code=400, detail="Невалидная дата")


@router.get("/{hotel_id}")
async def get_hotel(hotel_id: int, db: DBDep):
    try:
        return await HotelService(db).get_hotel(hotel_id)
    except ObjectNotFoundException:
        raise HotelNotFoundHTTPException


@router.post("")
async def create_hotel(hotel_data: HotelAdd, db: DBDep):
    hotel = await HotelService(db).add_hotel(hotel_data)
    return {"status": "OK", "data": hotel}


@router.put("/{hotel_id}")
async def edit_hotels(hotel_id: int, hotel_data: HotelAdd, db: DBDep):
    await HotelService(db).edit_hotel(hotel_id, hotel_data)
    return {"status": "OK"}


@router.patch("/{hotel_id}")
async def partially_edit_hotels(hotel_id: int, hotel_data: HotelPatch, db: DBDep):
    await HotelService(db).edit_hotel(hotel_id, hotel_data, exclude_unset=True)
    return {"status": "OK"}


@router.delete("/{hotel_id}")
async def delete_hotel(hotel_id: int, db: DBDep):
    await HotelService(db).delete_hotel(hotel_id)
    return {"status": "OK"}
