from datetime import date
from fastapi import APIRouter
from src.api.dependencies import AdminUserDep, DBDep
from src.schemas.rooms import Room, RoomAddRequest, RoomPatchRequest, RoomWithRels
from src.service.rooms import RoomService

router = APIRouter(prefix="/hotels", tags=["Номера"])


@router.get("/{hotel_id}/rooms", response_model=list[RoomWithRels])
async def get_rooms(date_from: date, date_to: date, hotel_id: int, db: DBDep):
    return await RoomService(db).get_rooms(date_from, date_to, hotel_id)


@router.get("/{hotel_id}/rooms/admin", response_model=list[RoomWithRels])
async def get_admin_rooms(hotel_id: int, db: DBDep, _: AdminUserDep):
    return await RoomService(db).get_admin_rooms(hotel_id)


@router.get("/{hotel_id}/rooms/{room_id}", response_model=RoomWithRels)
async def get_room(hotel_id: int, room_id: int, db: DBDep):
    return await RoomService(db).get_room(room_id, hotel_id)


@router.post("/{hotel_id}/rooms", response_model=Room, status_code=201)
async def create_room(
    hotel_id: int, room_data: RoomAddRequest, db: DBDep, _: AdminUserDep
):
    return await RoomService(db).add_room(hotel_id, room_data)


@router.put("/{hotel_id}/rooms/{room_id}")
async def edit_room(
    hotel_id: int, room_id: int, room_data: RoomAddRequest, db: DBDep, _: AdminUserDep
):
    await RoomService(db).edit_room(hotel_id, room_id, room_data)
    return {"status": "OK"}


@router.patch("/{hotel_id}/rooms/{room_id}")
async def patch_room(
    hotel_id: int, room_id: int, room_data: RoomPatchRequest, db: DBDep, _: AdminUserDep
):
    await RoomService(db).partially_edit_room(hotel_id, room_id, room_data)
    return {"status": "OK"}


@router.delete("/{hotel_id}/rooms/{room_id}")
async def delete_room(hotel_id: int, room_id: int, db: DBDep, _: AdminUserDep):
    await RoomService(db).delete_room(hotel_id, room_id)
    return {"status": "OK"}
