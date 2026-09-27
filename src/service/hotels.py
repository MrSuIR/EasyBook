from datetime import date

from src.exceptions import ObjectNotFoundException, HotelNotFoundException
from src.constants import HotelStatus
from src.schemas.common import SortOrder
from src.schemas.hotels import HotelAdd, HotelPatch, HotelSortBy, HotelStatusUpdate
from src.service.base import BaseService
from src.service.image_storage import remove_image_file


class HotelService(BaseService):
    async def get_hotels(
        self,
        page: int,
        per_page: int,
        date_from: date,
        date_to: date,
        title: str | None = None,
        location: str | None = None,
        sort_by: HotelSortBy | None = None,
        sort_order: SortOrder | None = None,
    ):
        return await self.db.hotels.get_filtered_by_time(
            date_from=date_from,
            date_to=date_to,
            location=location,
            title=title,
            limit=per_page,
            offset=per_page * (page - 1),
            sort_by=sort_by or HotelSortBy.ID,
            sort_order=sort_order or SortOrder.ASC,
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

    async def get_admin_hotels(
        self,
        page: int,
        per_page: int,
        title: str | None = None,
        location: str | None = None,
        status: HotelStatus | None = None,
        sort_by: HotelSortBy | None = None,
        sort_order: SortOrder | None = None,
    ):
        return await self.db.hotels.get_paginated(
            limit=per_page,
            offset=per_page * (page - 1),
            title=title,
            location=location,
            status=status,
            sort_by=sort_by or HotelSortBy.ID,
            sort_order=sort_order or SortOrder.ASC,
        )

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
            await self.db.hotels.get_for_update(hotel_id)
            images = await self.db.images.get_filtered(hotel_id=hotel_id)
            await self.db.hotels.delete(id=hotel_id)
        except ObjectNotFoundException as ex:
            raise HotelNotFoundException from ex
        await self.db.commit()
        for image in images:
            await remove_image_file(image.original_path)

    async def set_status(self, hotel_id: int, data: HotelStatusUpdate):
        try:
            await self.db.hotels.get_for_update(hotel_id)
            hotel = await self.db.hotels.edit(id=hotel_id, data=data, exclude_unset=True)
        except ObjectNotFoundException as ex:
            raise HotelNotFoundException from ex
        await self.db.commit()
        return hotel

    async def check_hotel_exist(self, hotel_id: int):
        try:
            await self.db.hotels.get_one(id=hotel_id)
        except ObjectNotFoundException:
            raise HotelNotFoundException
