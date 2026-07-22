import asyncio
import hashlib
import json
import logging
from dataclasses import asdict, dataclass
from io import BytesIO
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, UnidentifiedImageError

from src.config import settings


logger = logging.getLogger(__name__)

OVERPASS_URLS = (
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
)
COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"
REQUEST_HEADERS = {"User-Agent": "EasyBook-coursework-demo-seed/1.0"}
HOTELS_PER_DESTINATION = 30


@dataclass(frozen=True)
class DemoDestination:
    title: str
    country: str
    latitude: float
    longitude: float
    hotels_count: int
    radius_meters: int = 35_000
    commons_search: str | None = None

    @property
    def location(self) -> str:
        return f"{self.title}, {self.country}"


@dataclass(frozen=True)
class DemoHotelSource:
    title: str
    location: str
    image_path: str
    image_source_url: str
    image_page_url: str
    image_author: str
    image_license: str


DEMO_DESTINATIONS = (
    DemoDestination("Москва", "Россия", 55.7558, 37.6176, 30, 40_000),
    DemoDestination("Санкт-Петербург", "Россия", 59.9386, 30.3141, 24, 40_000),
    DemoDestination("Сочи", "Россия", 43.5855, 39.7231, 18, 55_000),
    DemoDestination("Байкал", "Россия", 51.8664, 104.8712, 10, 50_000, "Baikal hotel"),
    DemoDestination("Казань", "Россия", 55.7961, 49.1064, 16, 40_000),
    DemoDestination("Калининград", "Россия", 54.7104, 20.4522, 12, 45_000),
    DemoDestination("Мальдивы", "Мальдивы", 4.1755, 73.5093, 20, 60_000, "Maldives resort hotel"),
    DemoDestination("Стамбул", "Турция", 41.0082, 28.9784, 26, 50_000),
)

# Curated from official hotel and city tourism directories.  The names are kept
# in the repository so a first local launch never depends on a third-party API.
REAL_HOTEL_NAMES: dict[str, tuple[str, ...]] = {
    "Москва": (
        "Гостиница Метрополь", "Лотте Отель Москва", "Арарат Парк Хаятт Москва",
        "Отель Балчуг Кемпински Москва", "Отель Националь", "Swissôtel Красные Холмы",
        "Radisson Collection Hotel, Moscow", "Radisson Blu Олимпийский", "Москва Марриотт Империал Плаза",
        "Отель Савой Москва", "Mercure Арбат Москва", "Mercure Москва Бауманская",
        "Mercure Москва Павелецкая", "Novotel Москва Сити", "Novotel Москва Центр",
        "Novotel Москва Шереметьево", "ibis Москва Центр Бахрушина", "ibis Москва Павелецкая",
        "Cosmos Moscow Paveletskaya Hotel", "Cosmos Moscow VDNH Hotel", "AZIMUT Сити Отель Смоленская Москва",
        "AZIMUT Сити Отель Олимпик Москва", "AZIMUT Сити Отель Тульская Москва",
        "AZIMUT Сити Отель Комсити Москва", "AZIMUT Отель Аэростар Москва", "Palmira Business Club",
        "Holiday Inn Moscow Sokolniki", "Holiday Inn Moscow Tagansky", "DoubleTree by Hilton Moscow Marina",
        "Hotel Moscow Krasnoselskaya",
    ),
    "Санкт-Петербург": (
        "Гранд Отель Европа", "Гостиница Астория", "Отель Англетер", "Corinthia Санкт-Петербург",
        "Лотте Отель Санкт-Петербург", "Domina St. Petersburg", "Отель Wawelberg", "Гостиница Гельвеция",
        "Radisson Royal Hotel, St. Petersburg", "Radisson Sonya Hotel", "Park Inn by Radisson Прибалтийская",
        "Park Inn by Radisson Пулковская", "Cosmos Saint-Petersburg Pulkovskaya Hotel", "Novotel Санкт-Петербург Центр",
        "ibis Санкт-Петербург Центр", "AZIMUT Сити Отель Санкт-Петербург", "Гостиница Москва",
        "Гостиница Санкт-Петербург", "Гранд Отель Эмеральд", "Petro Palace Hotel", "SO/ Санкт-Петербург",
        "Rossi Boutique Hotel", "Taleon Imperial Hotel", "Theatre Square Hotel",
    ),
    "Сочи": (
        "Swissôtel Resort Сочи Камелия", "Pullman Сочи Центр", "Grand Karat Sochi", "Radisson Collection Paradise Resort & Spa",
        "Radisson Blu Resort & Congress Centre", "Rixos Красная Поляна Сочи", "Novotel Resort Красная Поляна Сочи",
        "Marriott Красная Поляна", "Courtyard by Marriott Сочи Красная Поляна", "Panorama By Mercure",
        "Mercure Роза Хутор", "Golden Tulip Роза Хутор", "Green Flow Роза Хутор", "Mövenpick Красная Поляна",
        "Hyatt Regency Sochi", "Sea Galaxy Hotel Congress & Spa", "Zvezdny Wellness & SPA", "Cosmos Sochi Hotel",
    ),
    "Байкал": (
        "Байкал Терра", "Baikal Village", "Байкальская Ривьера", "Загородный отель Байкал",
        "Усадьба Набаймар", "Байкальское шале", "Парк-отель Сагаан Морин", "Байкал Плаза",
        "Baikal Wood Hotel", "Эко-отель Тотем",
    ),
    "Казань": (
        "Крутушка", "AZIMUT Отель Бауман Казань", "Ramada by Wyndham Kazan City Centre", "Ногай",
        "Гранд Отель Казань", "Отель Казан Султан", "Отель Джузеппе", "Арт Отель Казань",
        "Cosmos Kazan Hotel", "Отель Каганат", "DoubleTree by Hilton Kazan City Center", "Courtyard by Marriott Kazan Kremlin",
        "Luciano Residence Kazan", "Hayall Hotel", "Отель Мираж", "Отель Ривьера",
    ),
    "Калининград": (
        "Crystal House Suite Hotel & SPA", "Отель Навигатор", "Отель Турист", "Radisson Blu Hotel, Kaliningrad",
        "Отель Королева Луиза", "ibis Калининград Центр", "Mercure Калининград Центр", "Парк-отель Маяковский",
        "Отель Балтика", "Гостиница Дона", "HARTMAN Hotel", "Friday Center",
    ),
    "Мальдивы": (
        "Soneva Fushi", "Soneva Jani", "Gili Lankanfushi Maldives", "Baros Maldives", "W Maldives",
        "Four Seasons Resort Maldives at Landaa Giraavaru", "Four Seasons Resort Maldives at Kuda Huraa",
        "Anantara Kihavah Maldives Villas", "Anantara Dhigu Maldives Resort", "Conrad Maldives Rangali Island",
        "The St. Regis Maldives Vommuli Resort", "The Ritz-Carlton Maldives, Fari Islands", "Patina Maldives, Fari Islands",
        "Cheval Blanc Randheli", "JOALI Maldives", "JOALI BEING", "Velaa Private Island Maldives",
        "One&Only Reethi Rah", "Waldorf Astoria Maldives Ithaafushi", "Park Hyatt Maldives Hadahaa",
    ),
    "Стамбул": (
        "Çırağan Palace Kempinski Istanbul", "Four Seasons Hotel Istanbul at Sultanahmet", "Four Seasons Hotel Istanbul at the Bosphorus",
        "The Peninsula Istanbul", "Raffles Istanbul", "Mandarin Oriental Bosphorus, Istanbul", "Shangri-La Bosphorus, Istanbul",
        "Swissôtel The Bosphorus, Istanbul", "Hilton Istanbul Bosphorus", "Conrad Istanbul Bosphorus", "The Ritz-Carlton, Istanbul",
        "Park Hyatt Istanbul - Maçka Palas", "Fairmont Quasar Istanbul", "The St. Regis Istanbul", "W Istanbul",
        "CVK Park Bosphorus Hotel Istanbul", "Radisson Blu Hotel, Istanbul Pera", "Pera Palace Hotel", "Hotel Sultania",
        "Sura Hagia Sophia Hotel", "Hagia Sofia Mansions Istanbul", "AJWA Sultanahmet", "Legacy Ottoman Hotel",
        "The Marmara Taksim", "Grand Hyatt Istanbul", "InterContinental Istanbul",
    ),
}

# Placeholder records created by the first local-only catalog implementation.
# They are listed explicitly so a subsequent seed can replace them without
# touching hotels created by a user.
LEGACY_PLACEHOLDER_NAME_PARTS = (
    "Гранд", "Панорама", "Резиденция", "Тихая гавань", "Белые ночи",
    "Золотой берег", "Северный ветер", "Лазурный", "Городской сад", "Маяк",
)
LEGACY_PLACEHOLDER_HOTEL_TITLES = tuple(
    f"{name_part} — {destination.title} {number:02d}"
    for destination in DEMO_DESTINATIONS
    for number in range(1, destination.hotels_count + 1)
    for name_part in (LEGACY_PLACEHOLDER_NAME_PARTS[(number - 1) % len(LEGACY_PLACEHOLDER_NAME_PARTS)],)
)


def demo_hotels_count() -> int:
    return sum(destination.hotels_count for destination in DEMO_DESTINATIONS)


class DemoCatalogSourceError(RuntimeError):
    pass


class BuiltInDemoCatalogProvider:
    """Deterministic catalog of real hotel names for a reliable first launch."""

    cache_dir = settings.IMAGE_DIR / "_demo_cache"

    async def load(self) -> tuple[DemoHotelSource, ...]:
        return tuple(
            DemoHotelSource(
                title=REAL_HOTEL_NAMES[destination.title][number - 1],
                location=destination.location,
                image_path="",
                image_source_url="",
                image_page_url="",
                image_author="",
                image_license="",
            )
            for destination in DEMO_DESTINATIONS
            for number in range(1, destination.hotels_count + 1)
        )


class DemoCatalogProvider(BuiltInDemoCatalogProvider):
    """Imports real hotel names, addresses, and Commons photographs into a local cache."""

    def __init__(self, cache_dir: Path | None = None) -> None:
        self.cache_dir = cache_dir or self.cache_dir
        self.assets_dir = self.cache_dir / "assets"
        self.manifest_path = self.cache_dir / "catalog.json"

    async def load(self) -> tuple[DemoHotelSource, ...]:
        cached = self._read_cache()
        if cached is not None:
            return cached
        if not settings.IMPORT_REMOTE_DEMO_CATALOG:
            return await super().load()
        try:
            return await self._load_from_sources()
        except (DemoCatalogSourceError, httpx.HTTPError) as exc:
            logger.warning(
                "Real demo catalog import is unavailable; using the offline fallback: %s", exc
            )
            return await super().load()

    def _read_cache(self) -> tuple[DemoHotelSource, ...] | None:
        if not self.manifest_path.exists():
            return None
        try:
            payload = json.loads(self.manifest_path.read_text(encoding="utf-8"))
            hotels = tuple(DemoHotelSource(**item) for item in payload["hotels"])
        except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
            return None
        if not payload.get("complete") or len(hotels) != demo_hotels_count():
            return None
        if not all((self.cache_dir / hotel.image_path).is_file() for hotel in hotels):
            return None
        return hotels

    async def _load_from_sources(self) -> tuple[DemoHotelSource, ...]:
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        timeout = httpx.Timeout(20.0, connect=8.0)
        async with httpx.AsyncClient(
            headers=REQUEST_HEADERS,
            timeout=timeout,
            follow_redirects=True,
            trust_env=False,
        ) as client:
            semaphore = asyncio.Semaphore(2)

            async def load_destination(destination: DemoDestination) -> list[DemoHotelSource]:
                async with semaphore:
                    hotels, image = await asyncio.gather(
                        self._fetch_hotels(client, destination),
                        self._find_city_hotel_image(client, destination),
                    )
                    return await self._build_sources(client, destination, hotels, image)

            catalog = [
                hotel
                for destination_hotels in await asyncio.gather(
                    *(load_destination(destination) for destination in DEMO_DESTINATIONS)
                )
                for hotel in destination_hotels
            ]
        self._write_cache(catalog)
        return tuple(catalog)

    async def _fetch_hotels(
        self, client: httpx.AsyncClient, destination: DemoDestination
    ) -> list[dict[str, str]]:
        query = (
            "[out:json][timeout:90];("
            f'nwr(around:{destination.radius_meters},{destination.latitude},{destination.longitude})'
            '["tourism"="hotel"]["name"];);out tags center 80;'
        )
        response = None
        failures = []
        for endpoint in OVERPASS_URLS:
            try:
                candidate = await client.post(endpoint, data={"data": query})
                candidate.raise_for_status()
                response = candidate
                break
            except httpx.HTTPError as exc:
                failures.append(str(exc))
        if response is None:
            raise DemoCatalogSourceError("OpenStreetMap request failed: " + "; ".join(failures))
        seen = set()
        hotels = []
        for element in response.json().get("elements", []):
            tags = element.get("tags", {})
            title = str(tags.get("name:ru") or tags.get("name:en") or tags.get("name") or "").strip()[:100]
            if not title or title.casefold() in seen:
                continue
            seen.add(title.casefold())
            address = " ".join(
                str(tags[key]).strip() for key in ("addr:street", "addr:housenumber") if tags.get(key)
            )
            city = str(tags.get("addr:city") or destination.title).strip()
            country = str(tags.get("addr:country") or destination.country).strip()
            hotels.append({"title": title, "location": ", ".join(part for part in (address, city, country) if part)})
        hotels.sort(key=lambda hotel: hotel["title"].casefold())
        if len(hotels) < destination.hotels_count:
            raise DemoCatalogSourceError(
                f"OpenStreetMap returned only {len(hotels)} hotels for {destination.location}"
            )
        return hotels[: destination.hotels_count]

    async def _find_city_hotel_image(
        self, client: httpx.AsyncClient, destination: DemoDestination
    ) -> dict[str, str]:
        query = destination.commons_search or f"hotel {destination.title}"
        params = {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"{query} filetype:bitmap",
            "gsrnamespace": 6,
            "gsrlimit": 5,
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": 1280,
            "iiextmetadatafilter": "Artist|LicenseShortName|UsageTerms",
        }
        try:
            response = await client.get(COMMONS_API_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise DemoCatalogSourceError(f"Wikimedia Commons request failed: {exc}") from exc
        for page in sorted(response.json().get("query", {}).get("pages", {}).values(), key=lambda page: page.get("index", 0)):
            info = (page.get("imageinfo") or [{}])[0]
            url = info.get("thumburl") or info.get("url")
            if not url:
                continue
            metadata = info.get("extmetadata", {})
            return {
                "url": str(url),
                "source_url": str(info.get("descriptionurl") or url),
                "page_url": str(info.get("descriptionshorturl") or info.get("descriptionurl") or ""),
                "author": self._metadata(metadata, "Artist"),
                "license": self._metadata(metadata, "LicenseShortName") or self._metadata(metadata, "UsageTerms"),
            }
        raise DemoCatalogSourceError(f"Wikimedia Commons did not return a hotel image for {destination.location}")

    async def _build_sources(
        self,
        client: httpx.AsyncClient,
        destination: DemoDestination,
        hotels: list[dict[str, str]],
        image: dict[str, str],
    ) -> list[DemoHotelSource]:
        response = await client.get(image["url"])
        response.raise_for_status()
        try:
            with Image.open(BytesIO(response.content)) as source:
                source.verify()
                image_format = source.format
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise DemoCatalogSourceError(f"Invalid Commons image for {destination.location}") from exc
        extensions = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
        if image_format not in extensions or len(response.content) > settings.MAX_IMAGE_SIZE_BYTES:
            raise DemoCatalogSourceError(f"Unsupported Commons image for {destination.location}")
        digest = hashlib.sha256(destination.location.encode()).hexdigest()[:20]
        relative_path = Path("assets") / f"{digest}{extensions[image_format]}"
        (self.cache_dir / relative_path).write_bytes(response.content)
        return [
            DemoHotelSource(
                title=hotel["title"],
                location=hotel["location"],
                image_path=relative_path.as_posix(),
                image_source_url=image["source_url"],
                image_page_url=image["page_url"],
                image_author=image["author"],
                image_license=image["license"],
            )
            for hotel in hotels
        ]

    def _write_cache(self, hotels: list[DemoHotelSource]) -> None:
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        temporary = self.manifest_path.with_suffix(".tmp")
        temporary.write_text(
            json.dumps({"version": 2, "complete": True, "hotels": [asdict(hotel) for hotel in hotels]}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temporary.replace(self.manifest_path)

    @staticmethod
    def _metadata(metadata: dict[str, Any], key: str) -> str:
        value = metadata.get(key, {})
        return str(value.get("value", "")).strip() if isinstance(value, dict) else ""

    async def _wikidata_image_title(
        self, client: httpx.AsyncClient, entity_id: str
    ) -> str | None:
        if not entity_id.startswith("Q") or not entity_id[1:].isdigit():
            return None
        try:
            response = await client.get(
                f"https://www.wikidata.org/wiki/Special:EntityData/{entity_id}.json"
            )
            response.raise_for_status()
            value = response.json()["entities"][entity_id]["claims"]["P18"][0]["mainsnak"]["datavalue"]["value"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
            return None
        return f"File:{value}" if isinstance(value, str) and value else None
