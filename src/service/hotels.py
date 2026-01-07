from datetime import date

from src.api.dependencies import PaginationDep
from src.exceptions import ObjectNotFoundException, HotelNotFoundException
from src.schemas.hotels import HotelAdd, HotelPatch
from src.service.base import BaseService


class HotelService(BaseService):
    async def get_hotels(
            self,
            pagination: PaginationDep,
            date_from: date | None = None,
            date_to: date | None = None,
            title: str | None = None,
            location: str | None = None,
    ):
        return await self.db.hotels.get_filtered_by_time(
            date_from=date_from,
            date_to=date_to,
            location=location,
            title=title,
            limit=pagination.per_page,
            offset=pagination.per_page * (pagination.page - 1),
        )

    async def get_hotel(self, hotel_id: int):
        return await self.db.hotels.get_one(id=hotel_id)

    async def add_hotel(self, hotel_data: HotelAdd):
        hotel = await self.db.hotels.add(data=hotel_data)
        await self.db.commit()
        return hotel

    async def edit_hotel(self, hotel_id: int, hotel_data: HotelAdd | HotelPatch, exclude_unset: bool = False):
        await self.db.hotels.edit(data=hotel_data, id=hotel_id, exclude_unset=exclude_unset)
        await self.db.commit()

    async def delete_hotel(self, hotel_id: int):
        await self.db.hotels.delete(id=hotel_id)
        await self.db.commit()

    async def check_hotel_exist(self, hotel_id: int):
        try:
            await self.db.hotels.get_one(id=hotel_id)
        except ObjectNotFoundException:
            raise HotelNotFoundException