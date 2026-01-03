from PIL import Image
import os
import asyncio

from src.database import async_session_maker_null_pool
from src.tasks.celery_app import celery_instance
from src.utils.db_manager import DBManager


@celery_instance.task
def resize_image(image_path: str):
    img = Image.open(image_path)
    output_dir = "src/static/images"
    filename = os.path.basename(image_path)
    name, ext = os.path.splitext(filename)
    widths = [1000, 500, 200]
    for width in widths:
        aspect_ratio = img.height / img.width
        new_height = int(width * aspect_ratio)

        resized_img = img.resize((width, new_height), Image.Resampling.LANCZOS)

        output_filename = f"{name}_{width}px{ext}"
        output_path = os.path.join(output_dir, output_filename)

        resized_img.save(output_path, quality=85, optimize=True)
        print(f"Сохранено: {output_path}")


async def get_bookings_with_today_checkin_helper():
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        await db.bookings.get_bookings_with_today_checkin()


@celery_instance.task(name="booking_today_checkin")
def send_emails_to_users_with_today_checkin():
    asyncio.run(get_bookings_with_today_checkin_helper())
