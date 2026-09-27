import json
from dataclasses import dataclass
from datetime import date
from typing import Protocol

from src.config import settings
from src.constants import UserRole
from src.schemas.facilities import Facility, FacilityAdd
from src.schemas.users import UserAdd
from src.service.auth import AuthService
from src.utils.time import local_today
from src.service.base import BaseService
from src.service.demo_catalog import (
    LEGACY_PLACEHOLDER_HOTEL_TITLES,
    DemoCatalogProvider,
    DemoHotelSource,
)


DEMO_PASSWORD = "12345678"
DEMO_USERS = (
    ("admin@example.com", "Алексей", "Смирнов", UserRole.ADMIN),
    ("client@example.com", "Анна", "Петрова", UserRole.CLIENT),
    ("traveler@example.com", "Тимур", "Волков", UserRole.CLIENT),
)
DEMO_FACILITIES = (
    "Wi-Fi",
    "Breakfast",
    "Parking",
    "Pool",
    "Spa",
    "Air conditioning",
    "Restaurant",
    "Fitness center",
    "Airport transfer",
    "Pet friendly",
    "Room service",
    "Family rooms",
)
_OLD_DEMO_CITIES = (
    "Москва",
    "Санкт-Петербург",
    "Казань",
    "Сочи",
    "Калининград",
    "Нижний Новгород",
    "Ярославль",
    "Владивосток",
    "Екатеринбург",
    "Новосибирск",
    "Самара",
    "Тула",
    "Псков",
    "Великий Новгород",
    "Иркутск",
    "Краснодар",
    "Ростов-на-Дону",
    "Пермь",
    "Уфа",
    "Мурманск",
)
LEGACY_DEMO_HOTEL_TITLES = (
    "Hotel1",
    "Hotel 1",
    "Metropol Demo",
    "Nevsky Demo",
    "Volga Demo",
    *tuple(
        f"EasyBook {_OLD_DEMO_CITIES[(number - 4) % len(_OLD_DEMO_CITIES)]} {number:03d}"
        for number in range(4, 101)
    ),
)


class DemoCatalogProviderProtocol(Protocol):
    async def load(self) -> tuple[DemoHotelSource, ...]: ...


class DemoSeedNotAllowedError(RuntimeError):
    pass


@dataclass(frozen=True)
class DemoSeedSummary:
    users: int
    facilities: int
    hotels: int
    rooms: int
    bookings: int
    reviews: int
    images: int


class DemoSeedService(BaseService):
    def __init__(self, db=None, catalog_provider: DemoCatalogProviderProtocol | None = None):
        super().__init__(db)
        self.catalog_provider = catalog_provider or DemoCatalogProvider()

    async def seed(self, today: date | None = None) -> DemoSeedSummary:
        if settings.MODE == "PROD":
            raise DemoSeedNotAllowedError("Demo data cannot be created when MODE=PROD")

        catalog = await self.catalog_provider.load()
        users = await self._ensure_users()
        facilities = await self._ensure_facilities()
        result = await self.db.demo_seed.replace_catalog(
            catalog=catalog,
            legacy_titles=(*LEGACY_DEMO_HOTEL_TITLES, *LEGACY_PLACEHOLDER_HOTEL_TITLES),
            users={email: user.id for email, user in users.items()},
            facilities={title: facility.id for title, facility in facilities.items()},
            today=today or local_today(),
        )
        await self.db.commit()
        self._write_attribution(catalog)
        return DemoSeedSummary(
            users=len(users),
            facilities=len(facilities),
            hotels=result.hotels,
            rooms=result.rooms,
            bookings=result.bookings,
            reviews=result.reviews,
            images=result.images,
        )

    async def _ensure_users(self):
        users = {}
        auth = AuthService()
        for email, first_name, last_name, role in DEMO_USERS:
            existing = await self.db.users.get_user_with_hashed_password(email=email)
            if existing is None:
                users[email] = await self.db.users.add(
                    UserAdd(
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        hashed_password=auth.hashed_password(DEMO_PASSWORD),
                        role=role,
                    )
                )
                continue
            password_matches = auth.verify_password(DEMO_PASSWORD, existing.hashed_password)
            if (
                existing.first_name != first_name
                or existing.last_name != last_name
                or existing.role != role
                or not password_matches
            ):
                existing = await self.db.users.edit(
                    UserAdd(
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        hashed_password=(
                            existing.hashed_password
                            if password_matches
                            else auth.hashed_password(DEMO_PASSWORD)
                        ),
                        role=role,
                    ),
                    id=existing.id,
                )
            users[email] = existing
        return users

    async def _ensure_facilities(self) -> dict[str, Facility]:
        facilities = {}
        for title in DEMO_FACILITIES:
            matches = await self.db.facilities.get_filtered(title=title)
            facilities[title] = (
                min(matches, key=lambda item: item.id)
                if matches
                else await self.db.facilities.add(FacilityAdd(title=title))
            )
        return facilities

    @staticmethod
    def _write_attribution(catalog) -> None:
        attribution_path = settings.IMAGE_DIR / "demo-image-attribution.json"
        previous_records = (
            json.loads(attribution_path.read_text(encoding="utf-8"))
            if attribution_path.exists()
            else []
        )
        records = [
            {
                "hotel": hotel.title,
                "location": hotel.location,
                "image_url": f"/static/images/{hotel.image_path}",
                "source_url": hotel.image_source_url,
                "source_page": hotel.image_page_url,
                "author": hotel.image_author,
                "license": hotel.image_license,
                "license_url": hotel.image_license_url,
            }
            for hotel in catalog
        ]
        attribution_path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        current_paths = {hotel.image_path for hotel in catalog}
        image_root = settings.IMAGE_DIR.resolve()
        for record in previous_records:
            image_url = record.get("image_url", "")
            prefix = "/static/images/"
            if not image_url.startswith(prefix):
                continue
            relative_path = image_url.removeprefix(prefix)
            if not relative_path.startswith("hotels/") or relative_path in current_paths:
                continue
            old_image = (settings.IMAGE_DIR / relative_path).resolve()
            if image_root not in old_image.parents:
                continue
            old_image.unlink(missing_ok=True)
            parent = old_image.parent
            while parent != image_root:
                try:
                    parent.rmdir()
                except OSError:
                    break
                parent = parent.parent
