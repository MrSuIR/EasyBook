from dataclasses import dataclass
from functools import partial
from io import BytesIO
import warnings

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from src.config import settings
from src.exceptions import FacilityImageDimensionsException, ImageTooLargeException, ImageValidationException


ALLOWED_IMAGES = {
    "JPEG": ("image/jpeg", ".jpg"),
    "PNG": ("image/png", ".png"),
    "WEBP": ("image/webp", ".webp"),
}


@dataclass(frozen=True)
class ValidatedImage:
    content: bytes
    extension: str


async def validate_image_upload(
    file: UploadFile, required_dimensions: tuple[int, int] | None = None
) -> ValidatedImage:
    content = await file.read(settings.MAX_IMAGE_SIZE_BYTES + 1)
    if len(content) > settings.MAX_IMAGE_SIZE_BYTES:
        raise ImageTooLargeException

    return await run_in_threadpool(
        partial(_validate_image_content, content, file.content_type, required_dimensions)
    )


def _validate_image_content(
    content: bytes, content_type: str | None, required_dimensions: tuple[int, int] | None
) -> ValidatedImage:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content), formats=list(ALLOWED_IMAGES)) as image:
                image_format = image.format
                dimensions = image.size
                image.verify()

            with Image.open(BytesIO(content), formats=list(ALLOWED_IMAGES)) as image:
                image.load()
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
    ) as exc:
        raise ImageValidationException from exc

    if image_format not in ALLOWED_IMAGES:
        raise ImageValidationException
    expected_mime, extension = ALLOWED_IMAGES[image_format]
    if content_type != expected_mime:
        raise ImageValidationException("MIME-тип не соответствует содержимому файла")
    if required_dimensions is not None and dimensions != required_dimensions:
        raise FacilityImageDimensionsException

    return ValidatedImage(content=content, extension=extension)
