from datetime import date, timedelta

import pytest


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
