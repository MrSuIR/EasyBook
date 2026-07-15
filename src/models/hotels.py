from __future__ import annotations
from typing import TYPE_CHECKING
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String

if TYPE_CHECKING:
    from src.models.images import HotelImagesOrm


class HotelsOrm(Base):
    __tablename__ = "hotels"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    location: Mapped[str]
    images: Mapped[list[HotelImagesOrm]] = relationship(
        back_populates="hotel", passive_deletes=True
    )
