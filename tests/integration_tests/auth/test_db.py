import pytest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from src.database import async_session_maker_null_pool


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "column,value",
    (
        ("first_name", "   "),
        ("last_name", "   "),
        ("first_name", "\t\n"),
        ("first_name", "И" * 101),
        ("last_name", "Ф" * 101),
    ),
)
async def test_database_rejects_invalid_user_names(clean_database, column, value):
    values = {
        "email": f"invalid-{column}-{len(value)}@example.com",
        "first_name": "Иван",
        "last_name": "Иванов",
        "hashed_password": "not-used-in-this-test",
        "role": "client",
    }
    values[column] = value

    async with async_session_maker_null_pool() as session:
        with pytest.raises(SQLAlchemyError):
            await session.execute(
                text(
                    "INSERT INTO users "
                    "(email, first_name, last_name, hashed_password, role) "
                    "VALUES (:email, :first_name, :last_name, :hashed_password, :role)"
                ),
                values,
            )
            await session.commit()
