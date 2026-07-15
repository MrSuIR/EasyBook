import typing
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import CheckConstraint, ForeignKey, Index

if typing.TYPE_CHECKING:
    from src.models import FacilitiesOrm


class RoomsOrm(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_rooms_price_nonnegative"),
        CheckConstraint("quantity > 0", name="ck_rooms_quantity_positive"),
        Index("ix_rooms_hotel_id", "hotel_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    hotel_id: Mapped[int] = mapped_column(ForeignKey("hotels.id", ondelete="RESTRICT"))
    title: Mapped[str]
    description: Mapped[str | None]
    price: Mapped[int]
    quantity: Mapped[int]

    facilities: Mapped[list["FacilitiesOrm"]] = relationship(
        back_populates="rooms",
        secondary="rooms_facilities",
    )
