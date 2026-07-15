from pydantic import BaseModel, Field, field_validator

from src.schemas.facilities import Facility


class RoomAddRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
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


class RoomAdd(BaseModel):
    hotel_id: int
    title: str
    description: str | None = None
    price: int = Field(ge=0)
    quantity: int = Field(gt=0)


class RoomPatch(BaseModel):
    hotel_id: int | None = None
    title: str | None = None
    description: str | None = None
    price: int | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, gt=0)


class RoomPatchRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    price: int | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, gt=0)
    facilities_ids: list[int] | None = None

    @field_validator("title")
    @classmethod
    def strip_optional_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Название не может быть пустым")
        return value


RoomPatchReqeust = RoomPatchRequest


class Room(RoomAdd):
    id: int


class RoomWithRels(Room):
    facilities: list[Facility]
