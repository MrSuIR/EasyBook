from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class HotelSortBy(StrEnum):
    ID = "id"
    TITLE = "title"
    LOCATION = "location"


class HotelAdd(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=1, max_length=500)

    @field_validator("title", "location")
    @classmethod
    def strip_non_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Значение не может быть пустым")
        return value


class Hotel(HotelAdd):
    id: int


class HotelPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    location: str | None = Field(default=None, min_length=1, max_length=500)

    @field_validator("title", "location")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Значение не может быть пустым")
        return value
