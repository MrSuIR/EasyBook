from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func
from datetime import date, datetime
from src.constants import BookingStatus


class BookingsOrm(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("date_from < date_to", name="ck_bookings_date_order"),
        CheckConstraint("price >= 0", name="ck_bookings_price_nonnegative"),
        CheckConstraint(
            "status IN ('confirmed', 'cancelled')", name="ck_bookings_status"
        ),
        Index(
            "ix_bookings_room_status_dates", "room_id", "status", "date_from", "date_to"
        ),
        Index("ix_bookings_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="RESTRICT"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    date_from: Mapped[date]
    date_to: Mapped[date]
    price: Mapped[int]
    status: Mapped[str] = mapped_column(
        String(20),
        default=BookingStatus.CONFIRMED.value,
        server_default=BookingStatus.CONFIRMED.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
