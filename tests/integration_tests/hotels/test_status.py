import asyncio
from datetime import date, timedelta

import pytest
from sqlalchemy import text

from src.database import engine_null_pool


@pytest.mark.asyncio
async def test_archived_hotel_is_visible_to_admin_but_cannot_be_booked(
    anonymous_client, client, admin_client, clean_database
):
    hotel_id = clean_database["hotel_id"]
    room_id = clean_database["room_id"]
    start = date.today() + timedelta(days=2)
    dates = {"date_from": str(start), "date_to": str(start + timedelta(days=1))}
    booking = await client.post("/bookings", json={"room_id": room_id, **dates})
    assert booking.status_code == 201

    response = await admin_client.patch(f"/hotels/{hotel_id}/status", json={"status": "archived"})
    assert response.status_code == 200
    assert response.json()["status"] == "archived"
    assert (await anonymous_client.get(f"/hotels/{hotel_id}")).json()["status"] == "archived"
    assert (await anonymous_client.get(f"/hotels/{hotel_id}/rooms", params=dates)).json() == []
    assert hotel_id not in [
        item["id"] for item in (await anonymous_client.get("/hotels", params=dates)).json()["items"]
    ]
    assert booking.json()["id"] in [item["id"] for item in (await client.get("/bookings/me")).json()]
    assert [item["id"] for item in (await admin_client.get("/hotels/admin", params={"status": "archived"})).json()["items"]] == [hotel_id]

    later = {"date_from": str(start + timedelta(days=2)), "date_to": str(start + timedelta(days=3))}
    denied = await client.post("/bookings", json={"room_id": room_id, **later})
    assert denied.status_code == 409
    assert denied.json()["code"] == "hotel_archived"
    restored = await admin_client.patch(f"/hotels/{hotel_id}/status", json={"status": "active"})
    assert restored.json()["status"] == "active"
    assert hotel_id in [
        item["id"] for item in (await anonymous_client.get("/hotels", params=later)).json()["items"]
    ]


@pytest.mark.asyncio
async def test_hotel_status_validation_and_permissions(client, admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    assert (await client.patch(f"/hotels/{hotel_id}/status", json={"status": "archived"})).status_code == 403
    assert (await admin_client.patch(f"/hotels/{hotel_id}/status", json={"status": "deleted"})).status_code == 422
    assert (await admin_client.patch("/hotels/99999/status", json={"status": "archived"})).status_code == 404


@pytest.mark.asyncio
async def test_booking_waits_for_archiving_transaction(client, clean_database):
    hotel_id = clean_database["hotel_id"]
    room_id = clean_database["room_id"]
    start = date.today() + timedelta(days=2)
    async with engine_null_pool.begin() as connection:
        await connection.execute(
            text("UPDATE hotels SET status = 'archived' WHERE id = :hotel_id"),
            {"hotel_id": hotel_id},
        )
        pending = asyncio.create_task(
            client.post(
                "/bookings",
                json={
                    "room_id": room_id,
                    "date_from": str(start),
                    "date_to": str(start + timedelta(days=1)),
                },
            )
        )
        await asyncio.sleep(0.05)
        assert not pending.done()
    result = await asyncio.wait_for(pending, timeout=5)
    assert result.status_code == 409
    assert result.json()["code"] == "hotel_archived"
