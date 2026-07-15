import asyncio
from pathlib import Path
from uuid import UUID

from PIL import Image

from src.config import settings
from src.constants import ImageStatus
from src.database import async_session_maker_null_pool
from src.schemas.images import HotelImageStatusPatch
from src.tasks.celery_app import celery_instance
from src.utils.db_manager import DBManager


async def _resize_image(image_id: UUID) -> None:
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        image = await db.images.get_one(id=image_id)
        original = settings.IMAGE_DIR / image.original_path
        try:
            with Image.open(original) as source:
                for width in (200, 500, 1000):
                    height = max(1, round(source.height * width / source.width))
                    resized = source.resize((width, height), Image.Resampling.LANCZOS)
                    output = Path(original.parent) / (
                        f"{original.stem}_{width}px{original.suffix}"
                    )
                    resized.save(output, quality=85, optimize=True)
            status = ImageStatus.READY
        except Exception:
            status = ImageStatus.FAILED
        await db.images.edit(HotelImageStatusPatch(status=status), id=image_id)
        await db.commit()


@celery_instance.task(name="resize_hotel_image")
def resize_image(image_id: str) -> None:
    asyncio.run(_resize_image(UUID(image_id)))
