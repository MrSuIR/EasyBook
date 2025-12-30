from datetime import date
from fastapi import APIRouter

from src.api.dependencies import DBDep
from src.schemas.facilities import RoomFacilityAdd
from src.schemas.rooms import RoomAddRequest, RoomAdd, RoomPatchReqeust, RoomPatch

router = APIRouter(prefix="/hotels", tags=["Номера"])

@router.get("/{hotel_id}/rooms")
async def get_rooms(
        date_from: date,
        date_to: date,
        hotel_id: int,
        db: DBDep
):
    return await db.rooms.get_filtered_by_time(hotel_id=hotel_id, date_from=date_from, date_to=date_to)


@router.get("/{hotel_id}/rooms/{room_id}")
async def get_room(
        hotel_id: int,
        room_id: int,
        db: DBDep
):
    return await db.rooms.get_room_with_rels(room_id=room_id, hotel_id=hotel_id)


@router.post("/{hotel_id}/rooms")
async def create_room(
        hotel_id: int,
        room_data: RoomAddRequest,
        db: DBDep
):
    data = RoomAdd(hotel_id=hotel_id, **room_data.model_dump())
    room = await db.rooms.add(data)
    room_facilities_data = [RoomFacilityAdd(room_id=room.id, facility_id=f_id) for f_id in room_data.facilities_ids]
    await db.rooms_facilities.add_bulk(room_facilities_data)
    await db.commit()
    return {"status": "OK", "data": room}


@router.put("/{hotel_id}/rooms/{room_id}")
async def edit_room(
        hotel_id: int,
        room_id: int,
        room_data: RoomAddRequest,
        db: DBDep
):
    data = RoomAdd(hotel_id=hotel_id, **room_data.model_dump())
    await db.rooms.edit(id=room_id, hotel_id=hotel_id, data=data, exclude_unset=False)
    await db.rooms_facilities.set_room_facilities(facilities_ids=room_data.facilities_ids, room_id=room_id)
    await db.commit()
    return {"status": "OK"}


@router.patch("/{hotel_id}/rooms/{room_id}")
async def partially_edit_room(
        hotel_id: int,
        room_id: int,
        room_data: RoomPatchReqeust,
        db: DBDep
):
    data = RoomPatch(hotel_id=hotel_id, **room_data.model_dump(exclude_unset=True))
    await db.rooms.edit(id=room_id, hotel_id=hotel_id, data=data, exclude_unset=True)
    facilities_ids = room_data.model_dump().get("facilities_ids")
    if facilities_ids:
        await db.rooms_facilities.set_room_facilities(facilities_ids=facilities_ids, room_id=room_id)
    await db.commit()
    return {"status": "OK"}


@router.delete("/{hotel_id}/rooms/{room_id}")
async def delete_room(
        hotel_id: int,
        room_id: int,
        db: DBDep
):
    await db.rooms.delete(id=room_id, hotel_id=hotel_id)
    await db.commit()
    return {"status": "OK"}

