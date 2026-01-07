from datetime import date
from fastapi import APIRouter, HTTPException
from src.api.dependencies import DBDep
from src.exceptions import (
    DateValuesException,
    ObjectNotFoundException,
    HotelNotFoundHTTPException,
    RoomNotFoundHTTPException, HotelNotFoundException, RoomNotFoundException,
)
from src.schemas.rooms import RoomAddRequest, RoomPatchReqeust
from src.service.rooms import RoomService

router = APIRouter(prefix="/hotels", tags=["Номера"])


@router.get("/{hotel_id}/rooms")
async def get_rooms(date_from: date, date_to: date, hotel_id: int, db: DBDep):
    try:
        return await RoomService(db).get_rooms(date_from, date_to, hotel_id)
    except DateValuesException:
        raise HTTPException(status_code=400, detail="Невалидная дата")


@router.get("/{hotel_id}/rooms/{room_id}")
async def get_room(hotel_id: int, room_id: int, db: DBDep):
    try:
        return await RoomService(db).get_room(room_id=room_id, hotel_id=hotel_id)
    except ObjectNotFoundException:
        raise RoomNotFoundHTTPException


@router.post("/{hotel_id}/rooms")
async def create_room(hotel_id: int, room_data: RoomAddRequest, db: DBDep):
    try:
        room = await RoomService(db).add_room(hotel_id=hotel_id, room_data=room_data)
    except HotelNotFoundException:
        raise HotelNotFoundHTTPException
    return {"status": "OK", "data": room}


@router.put("/{hotel_id}/rooms/{room_id}")
async def edit_room(hotel_id: int, room_id: int, room_data: RoomAddRequest, db: DBDep):
    try:
        await RoomService(db).edit_room(hotel_id=hotel_id, room_id=room_id, room_data=room_data)
    except HotelNotFoundException:
        raise HotelNotFoundHTTPException
    except RoomNotFoundException:
        raise RoomNotFoundHTTPException
    return {"status": "OK"}


@router.patch("/{hotel_id}/rooms/{room_id}")
async def partially_edit_room(hotel_id: int, room_id: int, room_data: RoomPatchReqeust, db: DBDep):
    try:
        await RoomService(db).partially_edit_room(hotel_id=hotel_id, room_id=room_id, room_data=room_data)
    except RoomNotFoundException:
        raise RoomNotFoundHTTPException
    return {"status": "OK"}


@router.delete("/{hotel_id}/rooms/{room_id}")
async def delete_room(hotel_id: int, room_id: int, db: DBDep):
    try:
        await RoomService(db).delete_room(hotel_id=hotel_id, room_id=room_id)
    except HotelNotFoundException:
        raise HotelNotFoundHTTPException
    except RoomNotFoundException:
        raise RoomNotFoundHTTPException
    return {"status": "OK"}
