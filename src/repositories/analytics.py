from datetime import date

from sqlalchemy import Numeric, case, cast, func, select

from src.constants import BookingStatus
from src.models import BookingsOrm, HotelsOrm, ReviewsOrm, RoomsOrm
from src.repositories.utils import sort_expression
from src.schemas.analytics import HotelAnalytics, HotelAnalyticsSortBy
from src.schemas.common import SortOrder


class AnalyticsRepository:
    def __init__(self, session):
        self.session = session

    async def get_hotels_report(
        self,
        limit: int,
        offset: int,
        sort_by: HotelAnalyticsSortBy,
        sort_order: SortOrder,
        date_from: date | None,
        date_to: date | None,
    ) -> tuple[list[HotelAnalytics], int]:
        booking_metrics = self._booking_metrics(date_from, date_to)
        review_metrics = self._review_metrics(date_from, date_to)

        confirmed_bookings = func.coalesce(booking_metrics.c.confirmed_bookings, 0)
        cancelled_bookings = func.coalesce(booking_metrics.c.cancelled_bookings, 0)
        booked_revenue = func.coalesce(booking_metrics.c.booked_revenue, 0)
        booked_nights = func.coalesce(booking_metrics.c.booked_nights, 0)

        total_bookings = confirmed_bookings + cancelled_bookings
        cancelled_percentage = cast(cancelled_bookings * 100, Numeric) / func.nullif(
            total_bookings, 0
        )
        cancellation_rate = case(
            (total_bookings > 0, func.round(cancelled_percentage, 2)),
            else_=0,
        )
        average_rating = review_metrics.c.average_rating

        query = (
            select(
                HotelsOrm.id.label("hotel_id"),
                HotelsOrm.title.label("hotel_title"),
                HotelsOrm.location.label("hotel_location"),
                confirmed_bookings.label("confirmed_bookings"),
                cancelled_bookings.label("cancelled_bookings"),
                booked_revenue.label("booked_revenue"),
                booked_nights.label("booked_nights"),
                average_rating,
                cancellation_rate.label("cancellation_rate"),
            )
            .outerjoin(booking_metrics, booking_metrics.c.hotel_id == HotelsOrm.id)
            .outerjoin(review_metrics, review_metrics.c.hotel_id == HotelsOrm.id)
        )

        match sort_by:
            case HotelAnalyticsSortBy.HOTEL_ID:
                sort_column = HotelsOrm.id
            case HotelAnalyticsSortBy.HOTEL_TITLE:
                sort_column = HotelsOrm.title
            case HotelAnalyticsSortBy.CONFIRMED_BOOKINGS:
                sort_column = confirmed_bookings
            case HotelAnalyticsSortBy.CANCELLED_BOOKINGS:
                sort_column = cancelled_bookings
            case HotelAnalyticsSortBy.BOOKED_REVENUE:
                sort_column = booked_revenue
            case HotelAnalyticsSortBy.BOOKED_NIGHTS:
                sort_column = booked_nights
            case HotelAnalyticsSortBy.AVERAGE_RATING:
                sort_column = average_rating
            case HotelAnalyticsSortBy.CANCELLATION_RATE:
                sort_column = cancellation_rate

        primary_order = sort_expression(sort_column, sort_order)
        if sort_by == HotelAnalyticsSortBy.AVERAGE_RATING:
            primary_order = primary_order.nullslast()

        query = query.order_by(primary_order)

        if sort_by != HotelAnalyticsSortBy.HOTEL_ID:
            id_order = sort_expression(HotelsOrm.id, sort_order)
            query = query.order_by(id_order)

        paginated_query = query.limit(limit).offset(offset)
        result = await self.session.execute(paginated_query)
        rows = result.mappings().all()

        hotels_count_query = select(func.count(HotelsOrm.id))
        total_result = await self.session.execute(hotels_count_query)
        total = total_result.scalar_one()

        return [HotelAnalytics.model_validate(row) for row in rows], total

    @staticmethod
    def _booking_metrics(date_from: date | None, date_to: date | None):
        period_filters = []
        if date_from is not None and date_to is not None:
            booking_starts_before_period_ends = BookingsOrm.date_from < date_to
            booking_ends_after_period_starts = BookingsOrm.date_to > date_from
            period_filters.extend(
                (booking_starts_before_period_ends, booking_ends_after_period_starts)
            )
            booked_nights = func.least(BookingsOrm.date_to, date_to) - func.greatest(
                BookingsOrm.date_from, date_from
            )
        else:
            booked_nights = BookingsOrm.date_to - BookingsOrm.date_from

        booking_is_confirmed = BookingsOrm.status == BookingStatus.CONFIRMED.value
        booking_is_cancelled = BookingsOrm.status == BookingStatus.CANCELLED.value

        confirmed_bookings = func.count(BookingsOrm.id).filter(booking_is_confirmed)
        cancelled_bookings = func.count(BookingsOrm.id).filter(booking_is_cancelled)
        confirmed_nights = case((booking_is_confirmed, booked_nights), else_=0)
        confirmed_revenue = case(
            (booking_is_confirmed, BookingsOrm.price * booked_nights),
            else_=0,
        )

        return (
            select(
                RoomsOrm.hotel_id.label("hotel_id"),
                confirmed_bookings.label("confirmed_bookings"),
                cancelled_bookings.label("cancelled_bookings"),
                func.coalesce(func.sum(confirmed_nights), 0).label("booked_nights"),
                func.coalesce(func.sum(confirmed_revenue), 0).label("booked_revenue"),
            )
            .join(RoomsOrm, RoomsOrm.id == BookingsOrm.room_id)
            .where(*period_filters)
            .group_by(RoomsOrm.hotel_id)
            .subquery()
        )

    @staticmethod
    def _review_metrics(date_from: date | None, date_to: date | None):
        review_filters = [BookingsOrm.status == BookingStatus.CONFIRMED.value]

        if date_from is not None and date_to is not None:
            checkout_is_on_or_after_period_start = BookingsOrm.date_to >= date_from
            checkout_is_before_period_end = BookingsOrm.date_to < date_to
            review_filters.extend(
                (checkout_is_on_or_after_period_start, checkout_is_before_period_end)
            )

        average_rating = func.round(func.avg(ReviewsOrm.rating), 2)
        return (
            select(
                RoomsOrm.hotel_id.label("hotel_id"),
                average_rating.label("average_rating"),
            )
            .join(BookingsOrm, BookingsOrm.id == ReviewsOrm.booking_id)
            .join(RoomsOrm, RoomsOrm.id == BookingsOrm.room_id)
            .where(*review_filters)
            .group_by(RoomsOrm.hotel_id)
            .subquery()
        )
