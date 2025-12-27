from datetime import date
from fastapi import APIRouter
from src import PaginationDep, DBDep
from src import HotelPATCH, HotelAdd
from fastapi_cache.decorator import cache

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
    return await db.hotels.get_filtered_by_time(
        date_from=date_from,
        date_to=date_to,
        location=location,
        title=title,
        limit=pagination.per_page,
        offset=pagination.per_page * (pagination.page - 1),
    )


@router.get("/{hotel_id}")
async def get_hotel(hotel_id: int, db: DBDep):
    return await db.hotels.get_one_or_none(id=hotel_id)


@router.post("")
async def create_hotel(hotel_data: HotelAdd, db: DBDep):
    hotel = await db.hotels.add(data=hotel_data)
    await db.commit()
    return {"status": "OK", "data": hotel}


@router.put("/{hotel_id}")
async def edit_hotels(
        hotel_id: int,
        hotel_data: HotelAdd,
        db: DBDep
):
    await db.hotels.edit(data=hotel_data, id=hotel_id, exclude_unset=False)
    await db.commit()
    return {"status": "OK"}


@router.patch("/{hotel_id}")
async def partially_edit_hotels(
        hotel_id: int,
        hotel_data: HotelPATCH,
        db: DBDep
):
    await db.hotels.edit(data=hotel_data, id=hotel_id, exclude_unset=True)
    await db.commit()
    return {"status": "OK"}


@router.delete("/{hotel_id}")
async def delete_hotel(hotel_id: int, db: DBDep):
    await db.hotels.delete(id=hotel_id)
    await db.commit()
    return {"status": "OK"}