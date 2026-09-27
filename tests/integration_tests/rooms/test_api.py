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


@pytest.mark.asyncio
async def test_room_patch_rejects_null_scalar_fields(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    room_id = clean_database["room_id"]
    for field in ("title", "price", "quantity"):
        response = await admin_client.patch(f"/hotels/{hotel_id}/rooms/{room_id}", json={field: None})
        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"


@pytest.mark.asyncio
async def test_room_quantity_cannot_drop_below_peak_occupancy(client, admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    room_data = {
        "title": "Double",
        "description": "Номер с двумя доступными экземплярами",
        "price": 2500,
        "quantity": 2,
        "facilities_ids": [],
    }
    created = await admin_client.post(f"/hotels/{hotel_id}/rooms", json=room_data)
    assert created.status_code == 201
    room_id = created.json()["id"]
    endpoint = f"/hotels/{hotel_id}/rooms/{room_id}"
    start = date.today() + timedelta(days=1)

    async def book(date_from, date_to):
        return await client.post(
            "/bookings",
            json={"room_id": room_id, "date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
        )

    first = await book(start, start + timedelta(days=2))
    second = await book(start, start + timedelta(days=2))
    assert first.status_code == second.status_code == 201

    patch = await admin_client.patch(endpoint, json={"quantity": 1})
    put = await admin_client.put(endpoint, json=room_data | {"quantity": 1})
    for response in (patch, put):
        assert response.status_code == 409
        assert response.json()["code"] == "room_quantity_below_bookings"

    assert (await client.post(f"/bookings/{second.json()['id']}/cancel")).status_code == 200
    assert (await admin_client.patch(endpoint, json={"quantity": 1})).status_code == 200


@pytest.mark.asyncio
async def test_adjacent_bookings_allow_quantity_reduction(client, admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    room_data = {
        "title": "Adjacent",
        "description": "Номер для проверки непересекающихся бронирований",
        "price": 2500,
        "quantity": 2,
        "facilities_ids": [],
    }
    room_id = (await admin_client.post(f"/hotels/{hotel_id}/rooms", json=room_data)).json()["id"]
    start = date.today() + timedelta(days=1)
    for date_from, date_to in ((start, start + timedelta(days=2)), (start + timedelta(days=2), start + timedelta(days=4))):
        response = await client.post(
            "/bookings",
            json={"room_id": room_id, "date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
        )
        assert response.status_code == 201

    response = await admin_client.put(
        f"/hotels/{hotel_id}/rooms/{room_id}", json=room_data | {"quantity": 1}
    )
    assert response.status_code == 200
