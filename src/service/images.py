from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import UploadFile

from src.exceptions import HotelNotFoundException, ImageNotFoundException, ObjectNotFoundException
from src.schemas.images import HotelImageAdd, HotelImagePathPatch, HotelImageResponse
from src.service.base import BaseService
from src.service.image_storage import remove_image_file, write_image_file
from src.service.image_validation import validate_image_upload


class ImageService(BaseService):
    async def upload_image(self, hotel_id: int, file: UploadFile) -> HotelImageResponse:
        await self._check_hotel(hotel_id)
        validated = await validate_image_upload(file)
        image_id = uuid4()
        relative_path = self._image_path(hotel_id, image_id, validated.extension)
        await write_image_file(relative_path, validated.content)
        try:
            image = await self.db.images.add(
                HotelImageAdd(id=image_id, hotel_id=hotel_id, original_path=relative_path.as_posix())
            )
            await self.db.commit()
        except Exception:
            await remove_image_file(relative_path)
            raise
        return self._to_response(image)

    async def get_images(self, hotel_id: int) -> list[HotelImageResponse]:
        await self._check_hotel(hotel_id)
        images = await self.db.images.get_filtered(hotel_id=hotel_id)
        return [self._to_response(image) for image in images]

    async def replace_image(self, hotel_id: int, image_id: UUID, file: UploadFile) -> HotelImageResponse:
        await self._check_hotel(hotel_id)
        image = await self._get_image(hotel_id, image_id)
        validated = await validate_image_upload(file)
        relative_path = self._image_path(hotel_id, uuid4(), validated.extension)
        await write_image_file(relative_path, validated.content)
        try:
            updated = await self.db.images.edit(
                data=HotelImagePathPatch(original_path=relative_path.as_posix()),
                id=image_id,
                hotel_id=hotel_id,
            )
            await self.db.commit()
        except Exception:
            await remove_image_file(relative_path)
            raise

        await remove_image_file(image.original_path)
        return self._to_response(updated)

    async def delete_image(self, hotel_id: int, image_id: UUID) -> None:
        image = await self._get_image(hotel_id, image_id)
        await self.db.images.delete(id=image_id, hotel_id=hotel_id)
        await self.db.commit()

        await remove_image_file(image.original_path)

    async def _check_hotel(self, hotel_id: int) -> None:
        try:
            await self.db.hotels.get_one(id=hotel_id)
        except ObjectNotFoundException as ex:
            raise HotelNotFoundException from ex

    async def _get_image(self, hotel_id: int, image_id: UUID):
        try:
            return await self.db.images.get_one(id=image_id, hotel_id=hotel_id)
        except ObjectNotFoundException as ex:
            raise ImageNotFoundException from ex

    @staticmethod
    def _image_path(hotel_id: int, storage_id: UUID, extension: str) -> Path:
        return Path("hotels") / str(hotel_id) / f"{storage_id}{extension}"

    @staticmethod
    def _to_response(image: Any) -> HotelImageResponse:
        original = Path(image.original_path)
        return HotelImageResponse(
            id=image.id,
            hotel_id=image.hotel_id,
            created_at=image.created_at,
            original_url=f"/static/images/{original.as_posix()}",
        )
