import logging
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from src.config import settings
from src.exceptions import (
    HotelNotFoundException,
    ImageNotFoundException,
    ImageTooLargeException,
    ImageValidationException,
    ObjectNotFoundException,
)
from src.schemas.images import (
    HotelImageAdd,
    HotelImagePathPatch,
    HotelImageResponse,
)
from src.service.base import BaseService


ALLOWED_IMAGES = {
    "JPEG": ("image/jpeg", ".jpg"),
    "PNG": ("image/png", ".png"),
    "WEBP": ("image/webp", ".webp"),
}
logger = logging.getLogger(__name__)


class ImageService(BaseService):
    async def upload_image(self, hotel_id: int, file: UploadFile) -> HotelImageResponse:
        await self._check_hotel(hotel_id)
        content, extension = await self._validate_image(file)
        image_id = uuid4()
        relative_path = self._write_image(hotel_id, image_id, extension, content)
        try:
            image = await self.db.images.add(
                HotelImageAdd(
                    id=image_id,
                    hotel_id=hotel_id,
                    original_path=relative_path.as_posix(),
                )
            )
            await self.db.commit()
        except Exception:
            (settings.IMAGE_DIR / relative_path).unlink(missing_ok=True)
            raise
        return self._to_response(image)

    async def get_images(self, hotel_id: int) -> list[HotelImageResponse]:
        await self._check_hotel(hotel_id)
        images = await self.db.images.get_filtered(hotel_id=hotel_id)
        return [self._to_response(image) for image in images]

    async def replace_image(
        self, hotel_id: int, image_id: UUID, file: UploadFile
    ) -> HotelImageResponse:
        await self._check_hotel(hotel_id)
        image = await self._get_image(hotel_id, image_id)
        content, extension = await self._validate_image(file)
        relative_path = self._write_image(hotel_id, uuid4(), extension, content)
        try:
            updated = await self.db.images.edit(
                data=HotelImagePathPatch(original_path=relative_path.as_posix()),
                id=image_id,
                hotel_id=hotel_id,
            )
            await self.db.commit()
        except Exception:
            (settings.IMAGE_DIR / relative_path).unlink(missing_ok=True)
            raise

        self._remove_image_file(settings.IMAGE_DIR / image.original_path)
        return self._to_response(updated)

    async def delete_image(self, hotel_id: int, image_id: UUID) -> None:
        image = await self._get_image(hotel_id, image_id)
        await self.db.images.delete(id=image_id, hotel_id=hotel_id)
        await self.db.commit()

        self._remove_image_file(settings.IMAGE_DIR / image.original_path)

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
    async def _validate_image(file: UploadFile) -> tuple[bytes, str]:
        content = await file.read(settings.MAX_IMAGE_SIZE_BYTES + 1)
        if len(content) > settings.MAX_IMAGE_SIZE_BYTES:
            raise ImageTooLargeException
        try:
            with Image.open(BytesIO(content)) as image:
                image.verify()
                image_format = image.format
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise ImageValidationException from exc
        if image_format not in ALLOWED_IMAGES:
            raise ImageValidationException
        expected_mime, extension = ALLOWED_IMAGES[image_format]
        if file.content_type != expected_mime:
            raise ImageValidationException(
                "MIME-тип не соответствует содержимому файла"
            )
        return content, extension

    @staticmethod
    def _write_image(
        hotel_id: int, storage_id: UUID, extension: str, content: bytes
    ) -> Path:
        hotel_dir = settings.IMAGE_DIR / str(hotel_id)
        hotel_dir.mkdir(parents=True, exist_ok=True)
        relative_path = Path(str(hotel_id)) / f"{storage_id}{extension}"
        (settings.IMAGE_DIR / relative_path).write_bytes(content)
        return relative_path

    @staticmethod
    def _remove_image_file(path: Path) -> None:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Не удалось удалить файл изображения %s", path, exc_info=True)

    @staticmethod
    def _to_response(image: Any) -> HotelImageResponse:
        original = Path(image.original_path)
        return HotelImageResponse(
            id=image.id,
            hotel_id=image.hotel_id,
            created_at=image.created_at,
            original_url=f"/static/images/{original.as_posix()}",
        )
