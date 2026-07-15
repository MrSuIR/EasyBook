from celery import Celery

from src.config import settings


celery_instance = Celery(
    "easybook",
    broker=settings.REDIS_URL,
    include=["src.tasks.tasks"],
)
celery_instance.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.TIMEZONE,
    enable_utc=True,
)
