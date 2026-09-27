from datetime import date
from src.exceptions import (
    FacilityNotFoundException,
    ObjectNotFoundException,
    RoomNotFoundException,
    RoomQuantityBelowBookingsException,
)
from src.schemas.facilities import RoomFacilityAdd
from src.schemas.rooms import RoomAdd, RoomAddRequest, RoomPatch, RoomPatchRequest
from src.service.base import BaseService
from src.service.hotels import HotelService
from src.constants import HotelStatus
from src.utils.time import local_today


class RoomService(BaseService):
    async def get_rooms(self, date_from: date, date_to: date, hotel_id: int):
        hotel = await HotelService(self.db).get_hotel(hotel_id)
        if hotel.status == HotelStatus.ARCHIVED:
            return []
        return await self.db.rooms.get_filtered_by_time(date_from, date_to, hotel_id)

    async def get_room(self, room_id: int, hotel_id: int):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        try:
            return await self.db.rooms.get_room_with_rels(room_id, hotel_id)
        except ObjectNotFoundException as ex:
            raise RoomNotFoundException from ex

    async def get_admin_rooms(self, hotel_id: int):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        return await self.db.rooms.get_all_for_hotel(hotel_id)

    async def add_room(self, hotel_id: int, room_data: RoomAddRequest):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        await self._validate_facilities(room_data.facilities_ids)

        room_fields = room_data.model_dump(exclude={"facilities_ids"})
        room = await self.db.rooms.add(RoomAdd(hotel_id=hotel_id, **room_fields))

        unique_facility_ids = set(room_data.facilities_ids)
        room_facilities = [
            RoomFacilityAdd(room_id=room.id, facility_id=facility_id) for facility_id in unique_facility_ids
        ]
        await self.db.rooms_facilities.add_bulk(room_facilities)
        await self.db.commit()
        return room

    async def edit_room(self, hotel_id: int, room_id: int, room_data: RoomAddRequest):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        room = await self._get_room_for_update(hotel_id, room_id)
        if room_data.quantity < room.quantity:
            await self._check_quantity(room_id, room_data.quantity)
        await self._validate_facilities(room_data.facilities_ids)

        room_fields = room_data.model_dump(exclude={"facilities_ids"})
        await self.db.rooms.edit(id=room_id, hotel_id=hotel_id, data=RoomAdd(hotel_id=hotel_id, **room_fields))

        unique_facility_ids = list(set(room_data.facilities_ids))
        await self.db.rooms_facilities.set_room_facilities(unique_facility_ids, room_id)
        await self.db.commit()

    async def partially_edit_room(self, hotel_id: int, room_id: int, room_data: RoomPatchRequest):
        await HotelService(self.db).check_hotel_exist(hotel_id)
        room = await self._get_room_for_update(hotel_id, room_id)
        if room_data.quantity is not None and room_data.quantity < room.quantity:
            await self._check_quantity(room_id, room_data.quantity)

        if "facilities_ids" in room_data.model_fields_set:
            facility_ids = room_data.facilities_ids or []
            await self._validate_facilities(facility_ids)
            unique_facility_ids = list(set(facility_ids))
            await self.db.rooms_facilities.set_room_facilities(unique_facility_ids, room_id)

        scalar_fields = room_data.model_dump(exclude_unset=True, exclude={"facilities_ids"})
        if scalar_fields:
            await self.db.rooms.edit(
                id=room_id, hotel_id=hotel_id, data=RoomPatch(**scalar_fields), exclude_unset=True
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

    async def _get_room_for_update(self, hotel_id: int, room_id: int):
        try:
            return await self.db.rooms.get_for_update(room_id, hotel_id)
        except ObjectNotFoundException as ex:
            raise RoomNotFoundException from ex

    async def _check_quantity(self, room_id: int, quantity: int):
        intervals = await self.db.rooms.get_current_and_future_confirmed_intervals(room_id, local_today())
        events = sorted(
            [(date_from, 1) for date_from, _ in intervals]
            + [(date_to, -1) for _, date_to in intervals]
        )
        occupied = 0
        for _, change in events:
            occupied += change
            if occupied > quantity:
                raise RoomQuantityBelowBookingsException

    async def _validate_facilities(self, ids: list[int]):
        if set(ids) != await self.db.rooms_facilities.existing_ids(ids):
            raise FacilityNotFoundException
