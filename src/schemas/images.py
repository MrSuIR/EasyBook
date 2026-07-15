from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from src.constants import ImageStatus


class HotelImageAdd(BaseModel):
    id: UUID
    hotel_id: int
    original_path: str
    status: ImageStatus = ImageStatus.PROCESSING


class HotelImage(HotelImageAdd):
    created_at: datetime


class HotelImageStatusPatch(BaseModel):
    status: ImageStatus


class HotelImageResponse(BaseModel):
    id: UUID
    hotel_id: int
    status: ImageStatus
    created_at: datetime
    original_url: str
    thumbnail_urls: dict[str, str]
