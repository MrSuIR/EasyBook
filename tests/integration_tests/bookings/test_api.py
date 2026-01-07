import pytest
from src.database import async_session_maker_null_pool
from src.utils.db_manager import DBManager


@pytest.mark.parametrize(
    "room_id, date_from, date_to, status_code",
    [
        (1, "2025-12-12", "2025-12-16", 200),
        (1, "2025-12-12", "2025-12-16", 200),
        (1, "2025-12-12", "2025-12-16", 200),
        (1, "2025-12-12", "2025-12-16", 200),
        (1, "2025-12-12", "2025-12-16", 200),
        (1, "2025-12-12", "2025-12-16", 409),
    ],
)
async def test_add_booking(room_id, date_from, date_to, status_code, db, authenticated_ac):
    response = await authenticated_ac.post(
        "/bookings",
        json={
            "room_id": room_id,
            "date_from": date_from,
            "date_to": date_to,
        },
    )
    assert response.status_code == status_code
    if status_code == 200:
        assert response.json()["status"] == "OK"
        assert response.json()["data"]


@pytest.fixture(scope="module")
async def delete_all_bookings():
    async with DBManager(session_factory=async_session_maker_null_pool) as db_module:
        await db_module.bookings.delete()
        await db_module.commit()


@pytest.mark.parametrize(
    "room_id, date_from, date_to, booked_rooms",
    [
        (1, "2025-12-12", "2025-12-16", 1),
        (1, "2025-12-12", "2025-12-16", 2),
        (1, "2025-12-12", "2025-12-16", 3),
    ],
)
async def test_add_and_get_bookings(
    room_id, date_from, date_to, booked_rooms, delete_all_bookings, authenticated_ac
):
    response_add_bookings = await authenticated_ac.post(
        "/bookings",
        json={
            "room_id": room_id,
            "date_from": date_from,
            "date_to": date_to,
        },
    )
    assert response_add_bookings.status_code == 200

    response_my_bookings = await authenticated_ac.get("/bookings/me")
    assert response_my_bookings.status_code == 200
    assert len(response_my_bookings.json()) == booked_rooms
