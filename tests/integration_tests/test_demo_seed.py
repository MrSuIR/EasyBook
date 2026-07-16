from datetime import date, timedelta

import pytest

from src.config import settings
from src.constants import BookingStatus, UserRole
from src.database import async_session_maker_null_pool
from src.service.auth import AuthService
from src.service.demo_seed import (
    DEMO_HOTELS,
    DEMO_PASSWORD,
    DemoSeedNotAllowedError,
    DemoSeedService,
)
from src.utils.db_manager import DBManager


@pytest.mark.asyncio
async def test_demo_seed_is_idempotent_and_creates_working_accounts(clean_database):
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        first = await DemoSeedService(db).seed(today=date.today())
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        second = await DemoSeedService(db).seed(
            today=date.today() + timedelta(days=1)
        )

        assert first == second
        assert first.users == 3
        assert first.facilities == 12
        assert first.hotels == 100
        assert first.rooms == 300
        assert first.bookings == 300
        assert first.reviews == 120

        auth = AuthService()
        for email, role in (
            ("admin@example.com", UserRole.ADMIN),
            ("client@example.com", UserRole.CLIENT),
            ("traveler@example.com", UserRole.CLIENT),
        ):
            user = await db.users.get_user_with_hashed_password(email=email)
            assert user is not None
            assert user.role == role
            assert auth.verify_password(DEMO_PASSWORD, user.hashed_password)

        demo_hotels = []
        demo_rooms = []
        for title, _, _ in DEMO_HOTELS:
            hotels = await db.hotels.get_filtered(title=title)
            assert len(hotels) == 1
            demo_hotels.extend(hotels)
            demo_rooms.extend(await db.rooms.get_filtered(hotel_id=hotels[0].id))
        assert len(demo_hotels) == 100
        assert len(demo_rooms) == 300
        assert await db.bookings.count() == 300
        assert await db.reviews.count() == 120
        cancelled = await db.bookings.get_filtered(
            status=BookingStatus.CANCELLED.value
        )
        assert len(cancelled) == 60
        assert all(booking.cancelled_at is not None for booking in cancelled)


@pytest.mark.asyncio
async def test_demo_seed_is_disabled_in_production(monkeypatch, clean_database):
    monkeypatch.setattr(settings, "MODE", "PROD")
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        with pytest.raises(DemoSeedNotAllowedError):
            await DemoSeedService(db).seed()
