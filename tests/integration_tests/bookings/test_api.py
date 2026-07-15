import asyncio
from datetime import date, timedelta

import pytest


def booking_payload(room_id: int, start_offset: int = 1, nights: int = 2):
    start = date.today() + timedelta(days=start_offset)
    return {
        "room_id": room_id,
        "date_from": start.isoformat(),
        "date_to": (start + timedelta(days=nights)).isoformat(),
    }


@pytest.mark.asyncio
async def test_adjacent_allowed_overlap_blocked_and_total(client, clean_database):
    room_id = clean_database["room_id"]
    first = await client.post("/bookings", json=booking_payload(room_id, 1, 2))
    assert first.status_code == 201
    assert first.json()["total_cost"] == 5000
    adjacent = await client.post("/bookings", json=booking_payload(room_id, 3, 1))
    assert adjacent.status_code == 201
    overlap = await client.post("/bookings", json=booking_payload(room_id, 2, 2))
    assert overlap.status_code == 409


@pytest.mark.asyncio
async def test_ten_parallel_requests_only_one_succeeds(client, clean_database):
    payload = booking_payload(clean_database["room_id"])
    responses = await asyncio.gather(
        *(client.post("/bookings", json=payload) for _ in range(10))
    )
    assert [response.status_code for response in responses].count(201) == 1
    assert [response.status_code for response in responses].count(409) == 9


@pytest.mark.asyncio
async def test_cancel_is_idempotent_frees_room_and_keeps_history(
    client, clean_database
):
    payload = booking_payload(clean_database["room_id"])
    created = await client.post("/bookings", json=payload)
    booking_id = created.json()["id"]
    first_cancel = await client.post(f"/bookings/{booking_id}/cancel")
    second_cancel = await client.post(f"/bookings/{booking_id}/cancel")
    assert first_cancel.json()["status"] == "cancelled"
    assert second_cancel.status_code == 200
    assert (await client.post("/bookings", json=payload)).status_code == 201
    history = await client.get("/bookings/me")
    assert any(item["id"] == booking_id for item in history.json())


@pytest.mark.asyncio
async def test_privacy_and_admin_listing(
    client, other_client, admin_client, clean_database
):
    created = await client.post(
        "/bookings", json=booking_payload(clean_database["room_id"])
    )
    booking_id = created.json()["id"]
    assert (await other_client.get(f"/bookings/{booking_id}")).status_code == 403
    assert (await client.get("/bookings")).status_code == 403
    listing = await admin_client.get("/bookings?page=1&per_page=5")
    assert listing.status_code == 200
    assert listing.json()["total"] == 1


@pytest.mark.asyncio
async def test_invalid_booking_dates(client, clean_database):
    room_id = clean_database["room_id"]
    today = date.today()
    cases = (
        (today - timedelta(days=1), today),
        (today, today),
        (today + timedelta(days=2), today + timedelta(days=1)),
    )
    for start, end in cases:
        response = await client.post(
            "/bookings",
            json={
                "room_id": room_id,
                "date_from": start.isoformat(),
                "date_to": end.isoformat(),
            },
        )
        assert response.status_code == 422
