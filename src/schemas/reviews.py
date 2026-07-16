from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


Rating = Annotated[int, Field(strict=True, ge=1, le=5)]


class ReviewSortBy(StrEnum):
    CREATED_AT = "created_at"
    RATING = "rating"


class ReviewCommentMixin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("comment", check_fields=False)
    @classmethod
    def strip_comment(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Комментарий не может быть пустым")
        if len(value) > 2000:
            raise ValueError("Комментарий не может быть длиннее 2000 символов")
        return value


class ReviewCreate(ReviewCommentMixin):
    booking_id: int = Field(gt=0)
    rating: Rating
    comment: str


class ReviewPatch(ReviewCommentMixin):
    rating: Rating | None = None
    comment: str | None = None

    @model_validator(mode="after")
    def validate_patch(self):
        if not self.model_fields_set:
            raise ValueError("Нужно передать rating или comment")

        contains_null = any(getattr(self, field_name) is None for field_name in self.model_fields_set)
        if contains_null:
            raise ValueError("Поля отзыва не могут быть null")

        return self


class ReviewAdd(BaseModel):
    booking_id: int
    rating: int
    comment: str


class ReviewPublic(BaseModel):
    id: int
    rating: int
    comment: str
    created_at: datetime
    updated_at: datetime


class Review(ReviewPublic):
    booking_id: int
