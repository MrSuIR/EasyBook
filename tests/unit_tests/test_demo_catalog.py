import json

import httpx
import pytest
from PIL import Image

from src.config import settings
from src.service.demo_catalog import (
    DEMO_DESTINATIONS,
    LEGACY_PLACEHOLDER_HOTEL_TITLES,
    REAL_HOTEL_NAMES,
    DemoCatalogProvider,
    DemoHotelSource,
    demo_hotels_count,
)


def test_destination_list_contains_requested_places_with_varied_hotel_counts():
    titles = {destination.title for destination in DEMO_DESTINATIONS}
    assert len(DEMO_DESTINATIONS) == 8
    assert len(titles) == 8
    assert {
        "Санкт-Петербург", "Москва", "Сочи", "Байкал", "Мальдивы", "Казань", "Калининград", "Стамбул"
    } == titles
    counts = {destination.hotels_count for destination in DEMO_DESTINATIONS}
    assert all(10 <= count <= 30 for count in counts)
    assert len(counts) == len(DEMO_DESTINATIONS)
    assert set(REAL_HOTEL_NAMES) == titles
    assert all(
        len(REAL_HOTEL_NAMES[destination.title]) == destination.hotels_count
        for destination in DEMO_DESTINATIONS
    )
    assert all(len(names) == len(set(names)) for names in REAL_HOTEL_NAMES.values())
    assert len(LEGACY_PLACEHOLDER_HOTEL_TITLES) == demo_hotels_count()


def test_provider_reads_complete_local_cache_without_network(tmp_path):
    provider = DemoCatalogProvider(tmp_path)
    asset = tmp_path / "assets" / "hotel.jpg"
    asset.parent.mkdir(parents=True)
    Image.new("RGB", (8, 8), "white").save(asset, format="JPEG")
    item = DemoHotelSource(
        title="Hotel",
        location="City, Country",
        image_path="assets/hotel.jpg",
        image_source_url="https://upload.wikimedia.org/hotel.jpg",
        image_page_url="https://commons.wikimedia.org/wiki/File:hotel.jpg",
        image_author="Author",
        image_license="CC BY 4.0",
    )
    hotels = [item.__dict__] * demo_hotels_count()
    provider.manifest_path.write_text(
        json.dumps({"version": 1, "complete": True, "hotels": hotels}), encoding="utf-8"
    )

    cached = provider._read_cache()

    assert cached is not None
    assert len(cached) == demo_hotels_count()


@pytest.mark.asyncio
async def test_provider_uses_local_catalog_without_requesting_remote_services(tmp_path, monkeypatch):
    provider = DemoCatalogProvider(tmp_path)
    monkeypatch.setattr(settings, "IMPORT_REMOTE_DEMO_CATALOG", False)

    async def unexpected_remote_import():
        raise AssertionError("The default demo seed must not make network requests")

    monkeypatch.setattr(provider, "_load_from_sources", unexpected_remote_import)

    catalog = await provider.load()

    assert len(catalog) == demo_hotels_count()
    assert all(hotel.image_path == "" for hotel in catalog)
    assert {hotel.title for hotel in catalog} == {
        hotel_name for names in REAL_HOTEL_NAMES.values() for hotel_name in names
    }


@pytest.mark.asyncio
async def test_provider_resolves_exact_wikidata_image(tmp_path):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/Q42.json")
        return httpx.Response(
            200,
            json={
                "entities": {
                    "Q42": {
                        "claims": {
                            "P18": [
                                {"mainsnak": {"datavalue": {"value": "Hotel photo.jpg"}}}
                            ]
                        }
                    }
                }
            },
        )

    provider = DemoCatalogProvider(tmp_path)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        title = await provider._wikidata_image_title(client, "Q42")

    assert title == "File:Hotel photo.jpg"
