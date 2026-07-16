from src.schemas.analytics import AnalyticsPeriod, HotelAnalyticsSortBy
from src.schemas.common import SortOrder
from src.service.base import BaseService


class AnalyticsService(BaseService):
    async def get_hotels_report(
        self,
        page: int,
        per_page: int,
        period: AnalyticsPeriod,
        sort_by: HotelAnalyticsSortBy | None,
        sort_order: SortOrder | None,
    ):
        selected_sort_field = sort_by or HotelAnalyticsSortBy.HOTEL_ID
        selected_sort_order = sort_order or SortOrder.ASC
        offset = per_page * (page - 1)

        return await self.db.analytics.get_hotels_report(
            limit=per_page,
            offset=offset,
            sort_by=selected_sort_field,
            sort_order=selected_sort_order,
            date_from=period.date_from,
            date_to=period.date_to,
        )
