from datetime import date
from src.exceptions import (
    FacilityNotFoundException,
    ObjectNotFoundException,
    RoomNotFoundException,
)
from src.schemas.facilities import RoomFacilityAdd
from src.schemas.rooms import RoomAdd, RoomAddRequest, RoomPatch, RoomPatchRequest
from src.service.base import BaseService
from src.service.hotels import HotelService


class RoomService(BaseService):
    async def get_rooms(self, date_from: date, date_to: date, hotel_id: int):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        return await self.db.rooms.get_filtered_by_time(date_from, date_to, hotel_id)

    async def get_room(self, room_id: int, hotel_id: int):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        try:
            return await self.db.rooms.get_room_with_rels(room_id, hotel_id)
        except ObjectNotFoundException as ex:
            raise RoomNotFoundException from ex

    async def add_room(self, hotel_id: int, room_data: RoomAddRequest):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        await self._validate_facilities(room_data.facilities_ids)
        room = await self.db.rooms.add(
            RoomAdd(
                hotel_id=hotel_id, **room_data.model_dump(exclude={"facilities_ids"})
            )
        )
        await self.db.rooms_facilities.add_bulk(
            [
                RoomFacilityAdd(room_id=room.id, facility_id=f)
                for f in set(room_data.facilities_ids)
            ]
        )
        await self.db.commit()
        return room

    async def edit_room(self, hotel_id: int, room_id: int, room_data: RoomAddRequest):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        await self.check_room_exist(hotel_id, room_id)
        await self._validate_facilities(room_data.facilities_ids)
        await self.db.rooms.edit(
            id=room_id,
            hotel_id=hotel_id,
            data=RoomAdd(
                hotel_id=hotel_id, **room_data.model_dump(exclude={"facilities_ids"})
            ),
        )
        await self.db.rooms_facilities.set_room_facilities(
            list(set(room_data.facilities_ids)), room_id
        )
        await self.db.commit()

    async def partially_edit_room(
        self, hotel_id: int, room_id: int, room_data: RoomPatchRequest
    ):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        await self.check_room_exist(hotel_id, room_id)
        if "facilities_ids" in room_data.model_fields_set:
            ids = room_data.facilities_ids or []
            await self._validate_facilities(ids)
            await self.db.rooms_facilities.set_room_facilities(list(set(ids)), room_id)
        scalar = room_data.model_dump(exclude_unset=True, exclude={"facilities_ids"})
        if scalar:
            await self.db.rooms.edit(
                id=room_id,
                hotel_id=hotel_id,
                data=RoomPatch(**scalar),
                exclude_unset=True,
            )
        await self.db.commit()

    async def delete_room(self, hotel_id: int, room_id: int):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        await self.check_room_exist(hotel_id, room_id)
        await self.db.rooms.delete(id=room_id, hotel_id=hotel_id)
        await self.db.commit()

    async def check_room_exist(self, hotel_id: int, room_id: int):
        try:
            return await self.db.rooms.get_one(id=room_id, hotel_id=hotel_id)
        except ObjectNotFoundException as ex:
            raise RoomNotFoundException from ex

    async def _validate_facilities(self, ids: list[int]):
        if set(ids) != await self.db.rooms_facilities.existing_ids(ids):
            raise FacilityNotFoundException
