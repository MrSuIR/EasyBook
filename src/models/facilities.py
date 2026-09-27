import typing
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint

if typing.TYPE_CHECKING:
    from src.models import RoomsOrm


class FacilitiesOrm(Base):
    __tablename__ = "facilities"
    __table_args__ = (
        CheckConstraint(
            "char_length(title) BETWEEN 1 AND 100 AND title ~ '[^[:space:]]'",
            name="ck_facilities_title_valid",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    image_path: Mapped[str | None] = mapped_column(String(500))

    rooms: Mapped[list["RoomsOrm"]] = relationship(back_populates="facilities", secondary="rooms_facilities")


class RoomsFacilitiesOrm(Base):
    __tablename__ = "rooms_facilities"
    __table_args__ = (UniqueConstraint("room_id", "facility_id", name="uq_rooms_facilities_pair"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
