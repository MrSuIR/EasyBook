from datetime import date

from src.exceptions import ObjectNotFoundException, HotelNotFoundException
from src.schemas.hotels import HotelAdd, HotelPatch
from src.service.base import BaseService


class HotelService(BaseService):
    async def get_hotels(
        self,
        page: int,
        per_page: int,
        date_from: date,
        date_to: date,
        title: str | None = None,
        location: str | None = None,
    ):
        return await self.db.hotels.get_filtered_by_time(
            date_from=date_from,
            date_to=date_to,
            location=location,
            title=title,
            limit=per_page,
            offset=per_page * (page - 1),
        )

    async def get_hotel(self, hotel_id: int):
        try:
            return await self.db.hotels.get_one(id=hotel_id)
        except ObjectNotFoundException as ex:
            raise HotelNotFoundException from ex

    async def add_hotel(self, hotel_data: HotelAdd):
        hotel = await self.db.hotels.add(data=hotel_data)
        await self.db.commit()
        return hotel

    async def edit_hotel(
        self,
        hotel_id: int,
        hotel_data: HotelAdd | HotelPatch,
        exclude_unset: bool = False,
    ):
        try:
            await self.db.hotels.edit(
                data=hotel_data, id=hotel_id, exclude_unset=exclude_unset
            )
        except ObjectNotFoundException as ex:
            raise HotelNotFoundException from ex
        await self.db.commit()

    async def delete_hotel(self, hotel_id: int):
        try:
            await self.db.hotels.delete(id=hotel_id)
        except ObjectNotFoundException as ex:
            raise HotelNotFoundException from ex
        await self.db.commit()

    async def check_hotel_exist(self, hotel_id: int):
        try:
            await self.db.hotels.get_one(id=hotel_id)
        except ObjectNotFoundException:
            raise HotelNotFoundException
