import typing
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import CheckConstraint, ForeignKey, Index, String

if typing.TYPE_CHECKING:
    from src.models import FacilitiesOrm


class RoomsOrm(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_rooms_price_nonnegative"),
        CheckConstraint("quantity > 0", name="ck_rooms_quantity_positive"),
        CheckConstraint(
            "char_length(description) BETWEEN 1 AND 500 AND description ~ '[^[:space:]]'",
            name="ck_rooms_description_valid",
        ),
        CheckConstraint(
            "char_length(title) BETWEEN 1 AND 200 AND title ~ '[^[:space:]]'",
            name="ck_rooms_title_valid",
        ),
        Index("ix_rooms_hotel_id", "hotel_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    hotel_id: Mapped[int] = mapped_column(ForeignKey("hotels.id", ondelete="RESTRICT"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    price: Mapped[int]
    quantity: Mapped[int]

    facilities: Mapped[list["FacilitiesOrm"]] = relationship(
        back_populates="rooms", secondary="rooms_facilities"
    )
