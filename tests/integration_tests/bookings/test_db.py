import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from src.database import engine_null_pool


@pytest.mark.asyncio
async def test_database_rejects_invalid_room_values(clean_database):
    hotel_id = clean_database["hotel_id"]
    for price, quantity in ((-1, 1), (1, 0)):
        with pytest.raises(IntegrityError):
            async with engine_null_pool.begin() as connection:
                await connection.execute(
                    text(
                        "INSERT INTO rooms "
                        "(hotel_id, title, description, price, quantity) "
                        "VALUES "
                        "(:hotel_id, 'Bad', 'Valid description', :price, :quantity)"
                    ),
                    {"hotel_id": hotel_id, "price": price, "quantity": quantity},
                )


@pytest.mark.asyncio
async def test_database_rejects_invalid_room_descriptions(clean_database):
    hotel_id = clean_database["hotel_id"]
    for description in (None, "", " \t\n ", "x" * 501):
        with pytest.raises(SQLAlchemyError):
            async with engine_null_pool.begin() as connection:
                await connection.execute(
                    text(
                        "INSERT INTO rooms "
                        "(hotel_id, title, description, price, quantity) "
                        "VALUES "
                        "(:hotel_id, 'Bad', :description, 1, 1)"
                    ),
                    {"hotel_id": hotel_id, "description": description},
                )


@pytest.mark.asyncio
async def test_database_rejects_invalid_catalog_text(clean_database):
    hotel_id = clean_database["hotel_id"]
    statements = (
        ("INSERT INTO hotels (title, location) VALUES ('   ', 'Moscow')", {}),
        ("INSERT INTO hotels (title, location) VALUES ('Valid', '   ')", {}),
        (
            "INSERT INTO rooms (hotel_id, title, description, price, quantity) "
            "VALUES (:hotel_id, '   ', 'Description', 1, 1)",
            {"hotel_id": hotel_id},
        ),
        ("INSERT INTO facilities (title) VALUES ('   ')", {}),
    )
    for statement, params in statements:
        with pytest.raises(IntegrityError):
            async with engine_null_pool.begin() as connection:
                await connection.execute(text(statement), params)


@pytest.mark.asyncio
async def test_database_rejects_negative_booking_price(clean_database):
    with pytest.raises(IntegrityError):
        async with engine_null_pool.begin() as connection:
            await connection.execute(
                text(
                    "INSERT INTO bookings "
                    "(room_id, user_id, date_from, date_to, price, status) "
                    "SELECT :room_id, id, CURRENT_DATE + 1, CURRENT_DATE + 2, -1, 'confirmed' "
                    "FROM users WHERE email = 'client@example.com'"
                ),
                {"room_id": clean_database["room_id"]},
            )
