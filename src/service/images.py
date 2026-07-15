from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from src.config import settings
from src.exceptions import ImageTooLargeException, ImageValidationException
from src.schemas.images import HotelImageAdd, HotelImageResponse
from src.service.base import BaseService


ALLOWED_IMAGES = {
    "JPEG": ("image/jpeg", ".jpg"),
    "PNG": ("image/png", ".png"),
    "WEBP": ("image/webp", ".webp"),
}


class ImageService(BaseService):
    async def upload_image(self, hotel_id: int, file: UploadFile) -> HotelImageResponse:
        await self.db.hotels.get_one(id=hotel_id)
        content = await file.read(settings.MAX_IMAGE_SIZE_BYTES + 1)
        if len(content) > settings.MAX_IMAGE_SIZE_BYTES:
            raise ImageTooLargeException

        image_id = uuid4()
        hotel_dir = settings.IMAGE_DIR / str(hotel_id)
        hotel_dir.mkdir(parents=True, exist_ok=True)

        try:
            from io import BytesIO

            with Image.open(BytesIO(content)) as image:
                image.verify()
                image_format = image.format
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise ImageValidationException from exc

        if image_format not in ALLOWED_IMAGES:
            raise ImageValidationException
        expected_mime, extension = ALLOWED_IMAGES[image_format]
        if file.content_type != expected_mime:
            raise ImageValidationException("MIME-тип не соответствует содержимому файла")

        relative_path = Path(str(hotel_id)) / f"{image_id}{extension}"
        absolute_path = settings.IMAGE_DIR / relative_path
        absolute_path.write_bytes(content)
        image = await self.db.images.add(
            HotelImageAdd(id=image_id, hotel_id=hotel_id, original_path=relative_path.as_posix())
        )
        await self.db.commit()
        return self._to_response(image)

    async def get_images(self, hotel_id: int) -> list[HotelImageResponse]:
        await self.db.hotels.get_one(id=hotel_id)
        images = await self.db.images.get_filtered(hotel_id=hotel_id)
        return [self._to_response(image) for image in images]

    async def delete_image(self, hotel_id: int, image_id: UUID) -> None:
        image = await self.db.images.get_one(id=image_id, hotel_id=hotel_id)
        await self.db.images.delete(id=image_id, hotel_id=hotel_id)
        await self.db.commit()

        original = settings.IMAGE_DIR / image.original_path
        original.unlink(missing_ok=True)

    @staticmethod
    def _to_response(image: Any) -> HotelImageResponse:
        original = Path(image.original_path)
        return HotelImageResponse(
            id=image.id,
            hotel_id=image.hotel_id,
            created_at=image.created_at,
            original_url=f"/static/images/{original.as_posix()}",
        )
