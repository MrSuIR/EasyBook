
import pytest


@pytest.mark.asyncio
async def test_room_validation_empty_facilities_and_clear(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    payload = {
        "title": "Suite",
        "description": None,
        "price": 5000,
        "quantity": 2,
        "facilities_ids": [],
    }
    created = await admin_client.post(f"/hotels/{hotel_id}/rooms", json=payload)
    assert created.status_code == 201
    room_id = created.json()["id"]

    facility_id = clean_database["facility_id"]
    assert (
        await admin_client.patch(
            f"/hotels/{hotel_id}/rooms/{room_id}",
            json={"facilities_ids": [facility_id]},
        )
    ).status_code == 200
    assert (
        await admin_client.patch(
            f"/hotels/{hotel_id}/rooms/{room_id}", json={"facilities_ids": []}
        )
    ).status_code == 200
    room = await admin_client.get(f"/hotels/{hotel_id}/rooms/{room_id}")
    assert room.json()["facilities"] == []


@pytest.mark.asyncio
async def test_room_invalid_values_and_unknown_facility(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    base = {"title": "Room", "price": 1, "quantity": 1, "facilities_ids": []}
    for field, value in (("price", -1), ("quantity", 0)):
        payload = base | {field: value}
        assert (
            await admin_client.post(f"/hotels/{hotel_id}/rooms", json=payload)
        ).status_code == 422
    response = await admin_client.post(
        f"/hotels/{hotel_id}/rooms",
        json=base | {"facilities_ids": [99999]},
    )
    assert response.status_code == 404
