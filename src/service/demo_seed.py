import json
import shutil
from dataclasses import dataclass
from datetime import date
from pathlib import Path
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
    "Metropol Demo",
    "Nevsky Demo",
    "Volga Demo",
    *tuple(
        f"EasyBook {_OLD_DEMO_CITIES[(number - 4) % len(_OLD_DEMO_CITIES)]} {number:03d}"
        for number in range(4, 101)
    ),
)


class DemoCatalogProviderProtocol(Protocol):
    cache_dir: Path

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
        created_paths = []
        try:
            created_paths = self._copy_images(result.image_bindings)
            await self.db.commit()
        except Exception:
            for path in created_paths:
                path.unlink(missing_ok=True)
            raise
        self._remove_old_images(
            result.old_image_paths,
            preserved_paths={binding.relative_path for binding in result.image_bindings},
        )
        self._write_attribution(catalog, result.image_bindings)
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

    def _copy_images(self, bindings) -> list[Path]:
        created = []
        for binding in bindings:
            source = self.catalog_provider.cache_dir / binding.source_path
            destination = settings.IMAGE_DIR / binding.relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination_existed = destination.exists()
            shutil.copyfile(source, destination)
            if not destination_existed:
                created.append(destination)
        return created

    @staticmethod
    def _remove_old_images(
        relative_paths: tuple[str, ...], preserved_paths: set[str]
    ) -> None:
        for relative_path in relative_paths:
            if relative_path in preserved_paths:
                continue
            path = settings.IMAGE_DIR / relative_path
            path.unlink(missing_ok=True)
            try:
                path.parent.rmdir()
            except OSError:
                pass

    @staticmethod
    def _write_attribution(catalog, bindings) -> None:
        if len(catalog) != len(bindings):
            return
        records = []
        for hotel, binding in zip(catalog, bindings, strict=True):
            records.append(
                {
                    "hotel": hotel.title,
                    "location": hotel.location,
                    "image_url": f"/static/images/{binding.relative_path}",
                    "source_url": hotel.image_source_url,
                    "source_page": hotel.image_page_url,
                    "author": hotel.image_author,
                    "license": hotel.image_license,
                }
            )
        attribution_path = settings.IMAGE_DIR / "demo-image-attribution.json"
        attribution_path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
        )
