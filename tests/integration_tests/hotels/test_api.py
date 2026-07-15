from datetime import date, timedelta

import pytest


async def create_available_hotel(admin_client, title: str, location: str) -> int:
    hotel = await admin_client.post(
        "/hotels", json={"title": title, "location": location}
    )
    assert hotel.status_code == 201
    hotel_id = hotel.json()["id"]
    room = await admin_client.post(
        f"/hotels/{hotel_id}/rooms",
        json={
            "title": "Standard",
            "price": 1000,
            "quantity": 1,
            "facilities_ids": [],
        },
    )
    assert room.status_code == 201
    return hotel_id


@pytest.mark.asyncio
async def test_catalog_permissions_and_pagination(
    anonymous_client, client, admin_client, clean_database
):
    start = date.today() + timedelta(days=1)
    listing = await anonymous_client.get(
        "/hotels", params={"date_from": start, "date_to": start + timedelta(days=1)}
    )
    assert listing.status_code == 200
    assert set(listing.json()) == {"items", "total", "page", "per_page"}

    payload = {"title": "New Hotel", "location": "Kazan"}
    assert (await anonymous_client.post("/hotels", json=payload)).status_code == 401
    assert (await client.post("/hotels", json=payload)).status_code == 403
    assert (await admin_client.post("/hotels", json=payload)).status_code == 201


@pytest.mark.asyncio
async def test_missing_objects_and_fk_conflict(admin_client, clean_database):
    assert (
        await admin_client.patch("/hotels/99999", json={"title": "X"})
    ).status_code == 404
    hotel_id = clean_database["hotel_id"]
    response = await admin_client.delete(f"/hotels/{hotel_id}")
    assert response.status_code == 409
    assert response.json()["code"] == "integrity_conflict"


@pytest.mark.asyncio
async def test_hotel_sorting_defaults_partial_params_and_tie_breaker(
    anonymous_client, admin_client, clean_database
):
    same_first = await create_available_hotel(admin_client, "Same", "Zvenigorod")
    same_second = await create_available_hotel(admin_client, "Same", "Arkhangelsk")
    start = date.today() + timedelta(days=1)
    base_params = {"date_from": start, "date_to": start + timedelta(days=1)}

    default = await anonymous_client.get("/hotels", params=base_params)
    assert [item["id"] for item in default.json()["items"]] == [
        clean_database["hotel_id"],
        same_first,
        same_second,
    ]

    descending_ids = await anonymous_client.get(
        "/hotels", params=base_params | {"sort_order": "desc"}
    )
    assert [item["id"] for item in descending_ids.json()["items"]] == [
        same_second,
        same_first,
        clean_database["hotel_id"],
    ]

    by_title = await anonymous_client.get(
        "/hotels", params=base_params | {"sort_by": "title"}
    )
    assert [item["id"] for item in by_title.json()["items"]] == [
        same_first,
        same_second,
        clean_database["hotel_id"],
    ]

    first_tied_page = await anonymous_client.get(
        "/hotels",
        params=base_params | {"sort_by": "title", "page": 1, "per_page": 1},
    )
    second_tied_page = await anonymous_client.get(
        "/hotels",
        params=base_params | {"sort_by": "title", "page": 2, "per_page": 1},
    )
    assert first_tied_page.json()["total"] == 3
    assert first_tied_page.json()["items"][0]["id"] == same_first
    assert second_tied_page.json()["items"][0]["id"] == same_second


@pytest.mark.asyncio
async def test_hotel_sorting_rejects_unknown_values(anonymous_client, clean_database):
    start = date.today() + timedelta(days=1)
    base_params = {"date_from": start, "date_to": start + timedelta(days=1)}
    for params in (
        base_params | {"sort_by": "price"},
        base_params | {"sort_order": "sideways"},
    ):
        assert (await anonymous_client.get("/hotels", params=params)).status_code == 422
    for sort_by in ("id", "title", "location"):
        response = await anonymous_client.get(
            "/hotels", params=base_params | {"sort_by": sort_by}
        )
        assert response.status_code == 200
