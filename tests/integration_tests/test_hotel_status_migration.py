import asyncio
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from src.database import Base, engine_null_pool


def run_alembic(action, config: Config, revision: str | None = None) -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        if revision is None:
            action(config)
        else:
            action(config, revision)
    finally:
        loop.close()
        asyncio.set_event_loop(None)


@pytest.mark.asyncio
async def test_hotel_status_migration_on_populated_and_clean_database(clean_database):
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    async with engine_null_pool.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)

    await asyncio.to_thread(run_alembic, command.upgrade, config, "a3c7e9f1b5d2")
    async with engine_null_pool.begin() as connection:
        await connection.execute(
            text("INSERT INTO hotels (id, title, location) VALUES (157, 'Existing hotel', 'Moscow')")
        )
    await asyncio.to_thread(run_alembic, command.upgrade, config, "head")
    async with engine_null_pool.connect() as connection:
        status = await connection.scalar(text("SELECT status FROM hotels WHERE id = 157"))
    assert status == "active"
    with pytest.raises(IntegrityError):
        async with engine_null_pool.begin() as connection:
            await connection.execute(text("UPDATE hotels SET status = 'deleted' WHERE id = 157"))
    await asyncio.to_thread(run_alembic, command.check, config)
    await asyncio.to_thread(run_alembic, command.downgrade, config, "base")

    await asyncio.to_thread(run_alembic, command.upgrade, config, "head")
    await asyncio.to_thread(run_alembic, command.check, config)
    await asyncio.to_thread(run_alembic, command.downgrade, config, "base")
