from src import RedisManager
from src import settings

redis_manager = RedisManager(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT
)