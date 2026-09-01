from __future__ import annotations
from typing import TYPE_CHECKING
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import CheckConstraint, String

if TYPE_CHECKING:
    from src.models.images import HotelImagesOrm


class HotelsOrm(Base):
    __tablename__ = "hotels"
    __table_args__ = (
        CheckConstraint(
            "char_length(title) BETWEEN 1 AND 100 AND title ~ '[^[:space:]]'",
            name="ck_hotels_title_valid",
        ),
        CheckConstraint(
            "char_length(location) BETWEEN 1 AND 500 AND location ~ '[^[:space:]]'",
            name="ck_hotels_location_valid",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(500))
    images: Mapped[list[HotelImagesOrm]] = relationship(
        back_populates="hotel", passive_deletes=True
    )
