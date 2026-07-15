from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class HotelImageAdd(BaseModel):
    id: UUID
    hotel_id: int
    original_path: str


class HotelImage(HotelImageAdd):
    created_at: datetime


class HotelImageResponse(BaseModel):
    id: UUID
    hotel_id: int
    created_at: datetime
    original_url: str
