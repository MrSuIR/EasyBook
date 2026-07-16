from datetime import date
from enum import StrEnum

from pydantic import BaseModel, model_validator


class HotelAnalyticsSortBy(StrEnum):
    HOTEL_ID = "hotel_id"
    HOTEL_TITLE = "hotel_title"
    CONFIRMED_BOOKINGS = "confirmed_bookings"
    CANCELLED_BOOKINGS = "cancelled_bookings"
    BOOKED_REVENUE = "booked_revenue"
    BOOKED_NIGHTS = "booked_nights"
    AVERAGE_RATING = "average_rating"
    CANCELLATION_RATE = "cancellation_rate"


class AnalyticsPeriod(BaseModel):
    date_from: date | None = None
    date_to: date | None = None

    @model_validator(mode="after")
    def validate_period(self):
        only_start_date_provided = self.date_from is not None and self.date_to is None
        only_end_date_provided = self.date_from is None and self.date_to is not None

        if only_start_date_provided or only_end_date_provided:
            raise ValueError("date_from и date_to должны передаваться вместе")

        if self.date_from is None or self.date_to is None:
            return self

        if self.date_from >= self.date_to:
            raise ValueError("date_to должна быть позже date_from")

        return self


class HotelAnalytics(BaseModel):
    hotel_id: int
    hotel_title: str
    hotel_location: str
    confirmed_bookings: int
    cancelled_bookings: int
    booked_revenue: int
    booked_nights: int
    average_rating: float | None
    cancellation_rate: float
