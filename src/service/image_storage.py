import logging
from functools import partial
from pathlib import Path

from starlette.concurrency import run_in_threadpool

from src.config import settings


logger = logging.getLogger(__name__)


async def write_image_file(relative_path: Path, content: bytes) -> None:
    await run_in_threadpool(partial(_write_image_file, relative_path, content))


def _write_image_file(relative_path: Path, content: bytes) -> None:
    absolute_path = settings.IMAGE_DIR / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(content)


async def remove_image_file(relative_path: str | Path) -> None:
    try:
        await run_in_threadpool(partial((settings.IMAGE_DIR / relative_path).unlink, missing_ok=True))
    except OSError:
        logger.warning("Не удалось удалить файл изображения %s", settings.IMAGE_DIR / relative_path, exc_info=True)
