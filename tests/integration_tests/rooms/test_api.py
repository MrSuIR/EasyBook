from datetime import date, timedelta

import pytest


@pytest.mark.asyncio
async def test_room_validation_empty_facilities_and_clear(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    payload = {
        "title": "Suite",
        "description": "  Просторный номер с гостиной  ",
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
            f"/hotels/{hotel_id}/rooms/{room_id}", json={"facilities_ids": [facility_id]}
        )
    ).status_code == 200
    assert (
        await admin_client.patch(f"/hotels/{hotel_id}/rooms/{room_id}", json={"facilities_ids": []})
    ).status_code == 200
    room = await admin_client.get(f"/hotels/{hotel_id}/rooms/{room_id}")
    assert room.json()["facilities"] == []
    assert room.json()["description"] == "Просторный номер с гостиной"


@pytest.mark.asyncio
async def test_room_invalid_values_and_unknown_facility(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    base = {"title": "Room", "description": "Уютный номер", "price": 1, "quantity": 1, "facilities_ids": []}
    for field, value in (("price", -1), ("quantity", 0)):
        payload = base | {field: value}
        assert (await admin_client.post(f"/hotels/{hotel_id}/rooms", json=payload)).status_code == 422
    response = await admin_client.post(f"/hotels/{hotel_id}/rooms", json=base | {"facilities_ids": [99999]})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_room_description_is_required_and_limited(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    endpoint = f"/hotels/{hotel_id}/rooms"
    base = {"title": "Room", "description": "Описание", "price": 1, "quantity": 1, "facilities_ids": []}

    invalid_payloads = (
        {key: value for key, value in base.items() if key != "description"},
        base | {"description": None},
        base | {"description": " \t\n "},
        base | {"description": "x" * 501},
    )
    for payload in invalid_payloads:
        response = await admin_client.post(endpoint, json=payload)
        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"

    created = await admin_client.post(endpoint, json=base | {"description": f"  {'x' * 500}  "})
    assert created.status_code == 201
    room_id = created.json()["id"]
    assert created.json()["description"] == "x" * 500

    for description in (None, "   ", "x" * 501):
        response = await admin_client.patch(f"{endpoint}/{room_id}", json={"description": description})
        assert response.status_code == 422

    patched = await admin_client.patch(f"{endpoint}/{room_id}", json={"price": 2})
    assert patched.status_code == 200
    room = await admin_client.get(f"{endpoint}/{room_id}")
    assert room.json()["description"] == "x" * 500

    date_from = date.today() + timedelta(days=1)
    listing = await admin_client.get(
        endpoint, params={"date_from": date_from, "date_to": date_from + timedelta(days=1)}
    )
    listed_room = next(item for item in listing.json() if item["id"] == room_id)
    assert listed_room["description"] == "x" * 500

    put_without_description = await admin_client.put(
        f"{endpoint}/{room_id}", json={"title": "Room", "price": 2, "quantity": 1, "facilities_ids": []}
    )
    assert put_without_description.status_code == 422
