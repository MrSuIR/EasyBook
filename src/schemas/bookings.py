from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, computed_field, model_validator
from src.constants import BookingStatus


class BookingSortBy(StrEnum):
    ID = "id"
    DATE_FROM = "date_from"
    DATE_TO = "date_to"
    PRICE = "price"
    STATUS = "status"


class BookingAddRequest(BaseModel):
    room_id: int
    date_from: date
    date_to: date

    @model_validator(mode="after")
    def validate_dates(self):
        if self.date_from < date.today():
            raise ValueError("Дата заезда не может быть в прошлом")
        if self.date_from >= self.date_to:
            raise ValueError("Дата выезда должна быть позже даты заезда")
        return self


class BookingAdd(BaseModel):
    room_id: int
    user_id: int
    date_from: date
    date_to: date
    price: int
    status: BookingStatus = BookingStatus.CONFIRMED


class Booking(BookingAdd):
    id: int
    created_at: datetime
    cancelled_at: datetime | None = None

    @computed_field
    @property
    def total_cost(self) -> int:
        return self.price * (self.date_to - self.date_from).days


class BookingCreate(BaseModel):
    room_id: int
    user_id: int
    date_from: date
    date_to: date
