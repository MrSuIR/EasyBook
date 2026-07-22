import httpx
import pytest

from src.config import settings
from src.exceptions import LocationProviderUnavailableException
from src.service.locations import GEOAPIFY_AUTOCOMPLETE_URL, LocationService


class FakeResponse:
    def raise_for_status(self):
        pass

    def json(self):
        return {
            "results": [
                {"city": "Париж", "country": "Франция"},
                {"city": "Париж", "country": "Франция"},
                {"name": "Москва", "country": "Россия"},
                {"city": "", "country": "Россия"},
            ]
        }


class FakeClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass

    async def get(self, url, *, params):
        assert url == GEOAPIFY_AUTOCOMPLETE_URL
        assert params["text"] == "Франц"
        assert params["type"] == "city"
        assert params["lang"] == "ru"
        assert params["apiKey"] == "test-key"
        return FakeResponse()


@pytest.mark.asyncio
async def test_location_suggestions_are_normalized_and_deduplicated(monkeypatch):
    monkeypatch.setattr(settings, "GEOAPIFY_API_KEY", "test-key")
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: FakeClient())

    result = await LocationService().suggest("Франц", 5)

    assert [item.model_dump() for item in result] == [
        {"city": "Париж", "country": "Франция", "label": "Париж, Франция"},
        {"city": "Москва", "country": "Россия", "label": "Москва, Россия"},
    ]


@pytest.mark.asyncio
async def test_location_suggestions_require_configuration(monkeypatch):
    monkeypatch.setattr(settings, "GEOAPIFY_API_KEY", None)

    with pytest.raises(LocationProviderUnavailableException):
        await LocationService().suggest("Москва", 5)
