import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from src.database import engine_null_pool


@pytest.mark.asyncio
async def test_database_rejects_invalid_room_values(clean_database):
    hotel_id = clean_database["hotel_id"]
    for price, quantity in ((-1, 1), (1, 0)):
        with pytest.raises(IntegrityError):
            async with engine_null_pool.begin() as connection:
                await connection.execute(
                    text(
                        "INSERT INTO rooms (hotel_id, title, price, quantity) "
                        "VALUES (:hotel_id, 'Bad', :price, :quantity)"
                    ),
                    {"hotel_id": hotel_id, "price": price, "quantity": quantity},
                )
