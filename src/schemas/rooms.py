from typing import Any

from pydantic import BaseModel, Field, field_validator

from src.schemas.facilities import Facility


ROOM_DESCRIPTION_MAX_LENGTH = 500


def _strip_description(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    value = value.strip()
    if not value:
        raise ValueError("Описание не может быть пустым")
    return value


class RoomAddRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=ROOM_DESCRIPTION_MAX_LENGTH)
    price: int = Field(ge=0)
    quantity: int = Field(gt=0)
    facilities_ids: list[int] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Название не может быть пустым")
        return value

    @field_validator("description", mode="before")
    @classmethod
    def strip_description(cls, value: Any) -> Any:
        return _strip_description(value)


class RoomAdd(BaseModel):
    hotel_id: int
    title: str
    description: str = Field(min_length=1, max_length=ROOM_DESCRIPTION_MAX_LENGTH)
    price: int = Field(ge=0)
    quantity: int = Field(gt=0)

    @field_validator("description", mode="before")
    @classmethod
    def strip_description(cls, value: Any) -> Any:
        return _strip_description(value)


class RoomPatch(BaseModel):
    hotel_id: int | None = None
    title: str | None = None
    description: str | None = Field(default=None, min_length=1, max_length=ROOM_DESCRIPTION_MAX_LENGTH)
    price: int | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, gt=0)

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Описание не может быть null")
        return _strip_description(value)


class RoomPatchRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=ROOM_DESCRIPTION_MAX_LENGTH)
    price: int | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, gt=0)
    facilities_ids: list[int] | None = None

    @field_validator("title", mode="before")
    @classmethod
    def strip_optional_title(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Название не может быть null")
        if not isinstance(value, str):
            return value
        value = value.strip()
        if not value:
            raise ValueError("Название не может быть пустым")
        return value

    @field_validator("price", "quantity", mode="before")
    @classmethod
    def reject_null_number(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Значение не может быть null")
        return value

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Описание не может быть null")
        return _strip_description(value)


class Room(RoomAdd):
    id: int


class RoomWithRels(Room):
    facilities: list[Facility]
