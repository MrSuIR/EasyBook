import pytest
from src.config import settings
from src.models import *
from src.database import Base, engine

@pytest.fixture(autouse=True)
async def async_main():
    assert settings.MODE == "TEST"
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)