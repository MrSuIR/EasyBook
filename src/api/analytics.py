from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from src.api.dependencies import AdminUserDep, DBDep, PaginationDep
from src.schemas.analytics import AnalyticsPeriod, HotelAnalytics, HotelAnalyticsSortBy
from src.schemas.common import PaginatedResponse, SortOrder
from src.service.analytics import AnalyticsService


router = APIRouter(prefix="/analytics", tags=["Аналитика"])


def get_analytics_period(date_from: date | None = None, date_to: date | None = None) -> AnalyticsPeriod:
    try:
        return AnalyticsPeriod(date_from=date_from, date_to=date_to)
    except ValidationError as ex:
        errors = ex.errors()
        for error in errors:
            error["loc"] = ("query", *error["loc"])
        raise RequestValidationError(errors) from ex


AnalyticsPeriodDep = Annotated[AnalyticsPeriod, Depends(get_analytics_period)]


@router.get("/hotels", response_model=PaginatedResponse[HotelAnalytics])
async def get_hotels_report(
    db: DBDep,
    pagination: PaginationDep,
    period: AnalyticsPeriodDep,
    _: AdminUserDep,
    sort_by: HotelAnalyticsSortBy | None = None,
    sort_order: SortOrder | None = None,
):
    items, total = await AnalyticsService(db).get_hotels_report(
        pagination.page, pagination.per_page, period, sort_by, sort_order
    )
    return PaginatedResponse(items=items, total=total, page=pagination.page, per_page=pagination.per_page)
