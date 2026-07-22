from pathlib import Path

from pydantic import BaseModel, Field, computed_field, field_validator


class FacilityAdd(BaseModel):
    title: str = Field(min_length=1, max_length=100)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Название не может быть пустым")
        return value


class Facility(FacilityAdd):
    id: int
    image_path: str | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def image_url(self) -> str | None:
        if self.image_path is None:
            return None
        return f"/static/images/{Path(self.image_path).as_posix()}"


class FacilityImagePathPatch(BaseModel):
    image_path: str | None


class RoomFacilityAdd(BaseModel):
    room_id: int
    facility_id: int


class RoomFacility(RoomFacilityAdd):
    id: int
