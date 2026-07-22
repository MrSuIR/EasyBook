from typing import Annotated

from fastapi import APIRouter, Query, Request

from src.api.auth import limiter
from src.schemas.locations import LocationSuggestion
from src.service.locations import LocationService


router = APIRouter(prefix="/locations", tags=["Подсказки местоположений"])


@router.get("/suggestions", response_model=list[LocationSuggestion])
@limiter.limit("60/minute")
async def get_location_suggestions(
    request: Request,
    q: Annotated[str, Query(min_length=2, max_length=100)],
    limit: Annotated[int, Query(ge=1, le=10)] = 5,
):
    return await LocationService().suggest(q, limit)
