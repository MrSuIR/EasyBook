from datetime import date, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.database import async_session_maker_null_pool, engine_null_pool
from src.schemas.bookings import BookingAdd
from src.utils.db_manager import DBManager


async def completed_booking_id(room_id: int) -> int:
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        user = await db.users.get_user_with_hashed_password(email="client@example.com")
        assert user is not None
        booking = await db.bookings.add(
            BookingAdd(
                room_id=room_id,
                user_id=user.id,
                date_from=date.today() - timedelta(days=2),
                date_to=date.today(),
                price=2500,
            )
        )
        await db.commit()
        return booking.id


@pytest.mark.asyncio
async def test_database_rejects_invalid_reviews(clean_database):
    booking_id = await completed_booking_id(clean_database["room_id"])
    invalid_values = (
        (0, "Комментарий"),
        (6, "Комментарий"),
        (5, ""),
        (5, " \t\n"),
        (5, "x" * 2001),
    )
    for rating, comment in invalid_values:
        with pytest.raises(SQLAlchemyError):
            async with engine_null_pool.begin() as connection:
                await connection.execute(
                    text(
                        "INSERT INTO reviews (booking_id, rating, comment) "
                        "VALUES (:booking_id, :rating, :comment)"
                    ),
                    {
                        "booking_id": booking_id,
                        "rating": rating,
                        "comment": comment,
                    },
                )


@pytest.mark.asyncio
async def test_database_enforces_one_review_per_booking(clean_database):
    booking_id = await completed_booking_id(clean_database["room_id"])
    async with engine_null_pool.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO reviews (booking_id, rating, comment) "
                "VALUES (:booking_id, 5, 'Первый')"
            ),
            {"booking_id": booking_id},
        )
    with pytest.raises(SQLAlchemyError):
        async with engine_null_pool.begin() as connection:
            await connection.execute(
                text(
                    "INSERT INTO reviews (booking_id, rating, comment) "
                    "VALUES (:booking_id, 4, 'Второй')"
                ),
                {"booking_id": booking_id},
            )
