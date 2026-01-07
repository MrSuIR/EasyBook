from datetime import date
from src.exceptions import ObjectNotFoundException, RoomNotFoundException
from src.schemas.facilities import RoomFacilityAdd
from src.schemas.rooms import RoomAdd, RoomAddRequest, RoomPatchReqeust, RoomPatch
from src.service.base import BaseService
from src.service.hotels import HotelService


class RoomService(BaseService):
    async def get_rooms(self, date_from: date, date_to: date, hotel_id: int):
        return await self.db.rooms.get_filtered_by_time(hotel_id=hotel_id, date_from=date_from, date_to=date_to)

    async def get_room(self, room_id: int, hotel_id: int):
        await HotelService(self.db).check_hotel_exist(hotel_id=hotel_id)
        return await self.db.rooms.get_room_with_rels(room_id=room_id, hotel_id=hotel_id)

    async def add_room(self, hotel_id: int, room_data: RoomAddRequest):
        await HotelService(self.db).check_hotel_exist(hotel_id=hotel_id)
        data = RoomAdd(hotel_id=hotel_id, **room_data.model_dump())
        room = await self.db.rooms.add(data)
        room_facilities_data = [
            RoomFacilityAdd(room_id=room.id, facility_id=f_id) for f_id in room_data.facilities_ids
        ]
        await self.db.rooms_facilities.add_bulk(room_facilities_data)
        await self.db.commit()
        return room

    async def edit_room(self, hotel_id: int, room_id: int, room_data: RoomAddRequest):
        await HotelService(self.db).check_hotel_exist(hotel_id=hotel_id)
        await self.check_room_exist(room_id=room_id, hotel_id=hotel_id)
        data = RoomAdd(hotel_id=hotel_id, **room_data.model_dump())
        await self.db.rooms.edit(id=room_id, hotel_id=hotel_id, data=data, exclude_unset=False)
        await self.db.rooms_facilities.set_room_facilities(
            facilities_ids=room_data.facilities_ids, room_id=room_id
        )
        await self.db.commit()

    async def partially_edit_room(self, hotel_id: int, room_id: int, room_data: RoomPatchReqeust):
        await HotelService(self.db).check_hotel_exist(hotel_id=hotel_id)
        await self.check_room_exist(room_id=room_id, hotel_id=hotel_id)
        data = RoomPatch(hotel_id=hotel_id, **room_data.model_dump(exclude_unset=True))
        await self.db.rooms.edit(id=room_id, hotel_id=hotel_id, data=data, exclude_unset=True)
        facilities_ids = room_data.model_dump().get("facilities_ids")
        if facilities_ids:
            await self.db.rooms_facilities.set_room_facilities(
                facilities_ids=facilities_ids, room_id=room_id
            )
        await self.db.commit()
        return {"status": "OK"}

    async def delete_room(self, hotel_id: int, room_id: int):
        await HotelService(self.db).check_hotel_exist(hotel_id=hotel_id)
        await self.check_room_exist(room_id=room_id, hotel_id=hotel_id)
        await self.db.rooms.delete(id=room_id, hotel_id=hotel_id)
        await self.db.commit()

    async def check_room_exist(self, hotel_id: int, room_id: int):
        try:
            return await self.db.rooms.get_one(id=room_id, hotel_id=hotel_id)
        except ObjectNotFoundException:
            raise RoomNotFoundException