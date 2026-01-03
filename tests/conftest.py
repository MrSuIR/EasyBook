import json
import pytest
from unittest import mock

mock.patch("fastapi_cache.decorator.cache", lambda *args, **kwargs: lambda f: f).start()
from src.api.dependencies import get_db  # noqa
from src.config import settings  # noqa
from src.main import app  # noqa
from src.models import *  # noqa
from httpx import AsyncClient, ASGITransport  # noqa
from src.database import Base, engine, async_session_maker_null_pool  # noqa
from src.schemas.hotels import HotelAdd  # noqa
from src.schemas.rooms import RoomAdd  # noqa
from src.utils.db_manager import DBManager  # noqa


@pytest.fixture(scope="function")
async def db():
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        yield db


async def get_db_null_pool():
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        yield db


app.dependency_overrides[get_db] = get_db_null_pool


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    assert settings.MODE == "TEST"
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    with open("mock_hotels.json", "r", encoding="utf-8") as file:
        hotels_data = json.load(file)
    with open("mock_rooms.json", "r", encoding="utf-8") as file:
        rooms_data = json.load(file)

    hotels = [HotelAdd.model_validate(hotel) for hotel in hotels_data]
    rooms = [RoomAdd.model_validate(room) for room in rooms_data]

    async with DBManager(session_factory=async_session_maker_null_pool) as db_:
        await db_.hotels.add_bulk(hotels)
        await db_.rooms.add_bulk(rooms)
        await db_.commit()


@pytest.fixture(scope="session")
async def ac():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="session", autouse=True)
async def register_user(ac, setup_database):
    await ac.post("/auth/register", json={"email": "email@mail.ru", "password": "1234"})


@pytest.fixture(scope="session")
async def authenticated_ac(register_user, ac):
    await ac.post("/auth/login", json={"email": "email@mail.ru", "password": "1234"})
    assert ac.cookies["access_token"]
    yield ac
