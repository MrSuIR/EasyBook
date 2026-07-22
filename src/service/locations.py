import httpx

from src.config import settings
from src.exceptions import LocationProviderUnavailableException
from src.schemas.locations import LocationSuggestion


GEOAPIFY_AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete"


class LocationService:
    async def suggest(self, query: str, limit: int) -> list[LocationSuggestion]:
        if not settings.GEOAPIFY_API_KEY:
            raise LocationProviderUnavailableException(
                "Глобальные подсказки не настроены: задайте GEOAPIFY_API_KEY"
            )

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=2.0)) as client:
                response = await client.get(
                    GEOAPIFY_AUTOCOMPLETE_URL,
                    params={
                        "text": query,
                        "type": "city",
                        "lang": "ru",
                        "format": "json",
                        "limit": limit,
                        "apiKey": settings.GEOAPIFY_API_KEY,
                    },
                )
                response.raise_for_status()
                results = response.json().get("results", [])
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise LocationProviderUnavailableException from exc

        suggestions: list[LocationSuggestion] = []
        seen: set[tuple[str, str]] = set()
        for result in results:
            city = str(result.get("city") or result.get("name") or "").strip()
            country = str(result.get("country") or "").strip()
            key = (city.casefold(), country.casefold())
            if not city or not country or key in seen:
                continue
            seen.add(key)
            suggestions.append(
                LocationSuggestion(city=city, country=country, label=f"{city}, {country}")
            )
        return suggestions
