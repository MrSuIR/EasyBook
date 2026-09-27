# ruff: noqa: E402, F403
import os
import shutil
import tempfile
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from testcontainers.postgres import PostgresContainer


postgres = PostgresContainer("postgres:16-alpine", driver="asyncpg")
postgres.start()
db_url = postgres.get_connection_url()
image_dir = tempfile.mkdtemp(prefix="easybook-test-images-")

from sqlalchemy.engine import make_url

url = make_url(db_url)
os.environ.update(
    {
        "MODE": "TEST",
        "DB_NAME": str(url.database),
        "DB_HOST": str(url.host),
        "DB_PORT": str(url.port),
        "DB_USER": str(url.username),
        "DB_PASS": str(url.password),
        "JWT_SECRET_KEY": "integration-test-secret",
        "IMAGE_DIR": image_dir,
    }
)

from src.api.dependencies import get_db
from src.constants import UserRole
from src.database import Base, engine, engine_null_pool
from src.main import app
from src.models import *  # noqa: F403
from src.schemas.facilities import FacilityAdd
from src.schemas.hotels import HotelAdd
from src.schemas.rooms import RoomAdd
from src.schemas.users import UserAdd
from src.service.auth import AuthService
from src.utils.db_manager import DBManager


async def get_test_db() -> AsyncIterator[DBManager]:
    from src.database import async_session_maker_null_pool

    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        yield db


app.dependency_overrides[get_db] = get_test_db


@pytest_asyncio.fixture(autouse=True)
async def clean_database():
    shutil.rmtree(image_dir, ignore_errors=True)
    os.makedirs(image_dir, exist_ok=True)
    async with engine_null_pool.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    from src.database import async_session_maker_null_pool

    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        hotel = await db.hotels.add(HotelAdd(title="Test Hotel", location="Moscow"))
        facility = await db.facilities.add(FacilityAdd(title="Wi-Fi"))
        room = await db.rooms.add(
            RoomAdd(hotel_id=hotel.id, title="Standard", description="Test room", price=2500, quantity=1)
        )
        password_hash = AuthService().hashed_password("password123")
        for email, first_name, last_name, role in (
            ("admin@example.com", "Алексей", "Смирнов", UserRole.ADMIN),
            ("client@example.com", "Анна", "Петрова", UserRole.CLIENT),
            ("other@example.com", "Иван", "Иванов", UserRole.CLIENT),
        ):
            await db.users.add(
                UserAdd(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    hashed_password=password_hash,
                    role=role,
                )
            )
        await db.commit()

    yield {"hotel_id": hotel.id, "room_id": room.id, "facility_id": facility.id}


async def _client_for(email: str | None = None) -> AsyncIterator[AsyncClient]:
    client = AsyncClient(transport=ASGITransport(app=app), base_url="https://test")
    if email:
        from src.database import async_session_maker_null_pool

        async with DBManager(session_factory=async_session_maker_null_pool) as db:
            user = await db.users.get_user_with_hashed_password(email=email)
        assert user is not None
        client.cookies.set("access_token", AuthService().create_access_token(user.id))
    try:
        yield client
    finally:
        await client.aclose()


@pytest_asyncio.fixture
async def anonymous_client():
    async for client in _client_for():
        yield client


@pytest_asyncio.fixture
async def admin_client():
    async for client in _client_for("admin@example.com"):
        yield client


@pytest_asyncio.fixture
async def client():
    async for value in _client_for("client@example.com"):
        yield value


@pytest_asyncio.fixture
async def other_client():
    async for value in _client_for("other@example.com"):
        yield value


@pytest.fixture(scope="session", autouse=True)
def cleanup_services():
    yield
    app.dependency_overrides.clear()
    import asyncio

    asyncio.run(engine.dispose())
    asyncio.run(engine_null_pool.dispose())
    postgres.stop()
    shutil.rmtree(image_dir, ignore_errors=True)
