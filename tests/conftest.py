import pytest
<<<<<<< HEAD
from src.config import settings
from src.models import *
from src.database import Base, engine

@pytest.fixture(autouse=True)
async def async_main():
    assert settings.MODE == "TEST"
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
=======
from httpx import AsyncClient
from src.config import settings
from src.database import Base, engine_null_pool
from src.main import app
from src.models import *

@pytest.fixture(scope="session" ,autouse=True)
async def async_main():
    assert settings.MODE == "TEST"
    async with engine_null_pool.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture(scope="session" ,autouse=True)
async def register_user():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        await ac.post(
            "/auth/register",
            json={"email": "email@mail.ru", "password": "1234"}
        )
>>>>>>> claude/fix-pytest-discovery-aNz0y
