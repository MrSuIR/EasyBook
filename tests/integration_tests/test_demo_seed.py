from datetime import date, timedelta
from pathlib import Path

import pytest
from PIL import Image

from src.config import settings
from src.constants import BookingStatus, UserRole
from src.database import async_session_maker_null_pool
from src.service.auth import AuthService
from src.service.demo_catalog import DEMO_DESTINATIONS, DemoHotelSource
from src.service.demo_seed import DEMO_PASSWORD, DemoSeedNotAllowedError, DemoSeedService
from src.repositories.demo_seed import ROOM_SPECS
from src.schemas.analytics import HotelAnalyticsSortBy
from src.schemas.common import SortOrder
from src.schemas.hotels import HotelAdd
from src.utils.db_manager import DBManager


class FakeCatalogProvider:
    def __init__(self, image_dir: Path):
        self.image_dir = image_dir
        assets = image_dir / "assets"
        assets.mkdir(parents=True)
        for index in range(3):
            Image.new("RGB", (32, 24), "navy").save(
                assets / f"hotel-{index}.jpg", format="JPEG"
            )

    async def load(self) -> tuple[DemoHotelSource, ...]:
        return tuple(
            DemoHotelSource(
                title=f"Real Hotel {destination.title} {number:02d}",
                location=destination.location,
                image_path=f"assets/hotel-{(number - 1) % 3}.jpg",
                image_source_url="https://upload.wikimedia.org/example.jpg",
                image_page_url="https://commons.wikimedia.org/wiki/File:example.jpg",
                image_author="Demo author",
                image_license="CC BY-SA 4.0",
            )
            for destination in DEMO_DESTINATIONS
            for number in range(1, destination.hotels_count + 1)
        )


@pytest.mark.asyncio
async def test_demo_seed_is_idempotent_and_creates_global_catalog(clean_database, tmp_path, monkeypatch):
    image_dir = tmp_path / "images"
    monkeypatch.setattr(settings, "IMAGE_DIR", image_dir)
    provider = FakeCatalogProvider(image_dir)
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        await db.hotels.add(HotelAdd(title="Hotel1", location="Location1"))
        await db.commit()
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        first = await DemoSeedService(db, provider).seed(today=date.today())
        first_ids = {
            "hotels": sorted(item.id for item in await db.hotels.get_all()),
            "rooms": sorted(item.id for item in await db.rooms.get_all()),
            "bookings": sorted(item.id for item in await db.bookings.get_all()),
            "reviews": sorted(item.id for item in await db.reviews.get_all()),
        }
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        second = await DemoSeedService(db, provider).seed(today=date.today() + timedelta(days=1))
        second_ids = {
            "hotels": sorted(item.id for item in await db.hotels.get_all()),
            "rooms": sorted(item.id for item in await db.rooms.get_all()),
            "bookings": sorted(item.id for item in await db.bookings.get_all()),
            "reviews": sorted(item.id for item in await db.reviews.get_all()),
        }

        assert first == second
        assert second_ids == first_ids
        assert first.users == 3
        assert first.facilities == 12
        assert first.hotels == sum(destination.hotels_count for destination in DEMO_DESTINATIONS)
        assert first.rooms == first.hotels * 3
        assert first.bookings == first.hotels * 3
        assert first.reviews == first.hotels
        assert first.images == first.hotels * 3

        auth = AuthService()
        for email, first_name, last_name, role in (
            ("admin@example.com", "Алексей", "Смирнов", UserRole.ADMIN),
            ("client@example.com", "Анна", "Петрова", UserRole.CLIENT),
            ("traveler@example.com", "Тимур", "Волков", UserRole.CLIENT),
        ):
            user = await db.users.get_user_with_hashed_password(email=email)
            assert user is not None
            assert user.first_name == first_name
            assert user.last_name == last_name
            assert user.role == role
            assert auth.verify_password(DEMO_PASSWORD, user.hashed_password)

        for destination in DEMO_DESTINATIONS:
            hotels = await db.hotels.get_filtered(location=destination.location)
            assert len(hotels) == destination.hotels_count

        assert await db.hotels.count() == first.hotels + 1
        assert await db.rooms.count() == first.rooms + 1
        assert await db.bookings.count() == first.bookings
        assert await db.reviews.count() == first.reviews
        assert await db.images.count() == first.images
        assert not await db.hotels.get_filtered(title="Hotel1")

        demo_descriptions = {description for _, description, _, _ in ROOM_SPECS}
        rooms = await db.rooms.get_all()
        seeded_room_descriptions = [
            room.description for room in rooms if room.description in demo_descriptions
        ]
        assert len(seeded_room_descriptions) == first.rooms
        assert all(120 <= len(description) <= 500 for description in seeded_room_descriptions)
        assert all(description.count(".") >= 2 for description in seeded_room_descriptions)

        cancelled = await db.bookings.get_filtered(status=BookingStatus.CANCELLED.value)
        assert len(cancelled) == first.hotels
        assert all(booking.cancelled_at is not None for booking in cancelled)
        image_records = await db.images.get_all()
        assert all((image_dir / image.original_path).is_file() for image in image_records)
        assert (image_dir / "demo-image-attribution.json").is_file()

        analytics, total = await db.analytics.get_hotels_report(
            limit=first.hotels + 1,
            offset=0,
            sort_by=HotelAnalyticsSortBy.HOTEL_ID,
            sort_order=SortOrder.ASC,
            date_from=None,
            date_to=None,
        )
        demo_locations = {destination.location for destination in DEMO_DESTINATIONS}
        demo_analytics = [row for row in analytics if row.hotel_location in demo_locations]
        assert total == first.hotels + 1
        assert len(demo_analytics) == first.hotels
        assert all(row.confirmed_bookings == 2 for row in demo_analytics)
        assert all(row.cancelled_bookings == 1 for row in demo_analytics)
        assert all(row.booked_nights > 0 for row in demo_analytics)
        assert all(row.booked_revenue > 0 for row in demo_analytics)
        assert all(row.average_rating is not None for row in demo_analytics)
        assert all(row.cancellation_rate == pytest.approx(33.33) for row in demo_analytics)


@pytest.mark.asyncio
async def test_demo_seed_is_disabled_in_production(monkeypatch, clean_database):
    monkeypatch.setattr(settings, "MODE", "PROD")
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        with pytest.raises(DemoSeedNotAllowedError):
            await DemoSeedService(db).seed()
