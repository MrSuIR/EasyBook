from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database import Base

if TYPE_CHECKING:
    from src.models.hotels import HotelsOrm


class HotelImagesOrm(Base):
    __tablename__ = "hotel_images"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    hotel_id: Mapped[int] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), index=True)
    original_path: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    hotel: Mapped[HotelsOrm] = relationship(back_populates="images")
