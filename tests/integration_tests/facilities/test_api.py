import pytest


@pytest.mark.asyncio
async def test_facility_mutations_require_admin(anonymous_client, client, admin_client):
    payload = {"title": "Breakfast"}
    assert (await anonymous_client.post("/facilities", json=payload)).status_code == 401
    assert (await client.post("/facilities", json=payload)).status_code == 403
    created = await admin_client.post("/facilities", json=payload)
    assert created.status_code == 201
    facility_id = created.json()["id"]
    assert (
        await client.put(f"/facilities/{facility_id}", json={"title": "Pool"})
    ).status_code == 403
    edited = await admin_client.put(
        f"/facilities/{facility_id}", json={"title": "  Pool  "}
    )
    assert edited.status_code == 200
    assert edited.json() == {"id": facility_id, "title": "Pool"}
    assert (
        await admin_client.delete(f"/facilities/{facility_id}")
    ).status_code == 200


@pytest.mark.asyncio
async def test_edit_missing_facility_returns_domain_404(admin_client):
    response = await admin_client.put("/facilities/999999", json={"title": "Pool"})
    assert response.status_code == 404
    assert response.json()["code"] == "facility_not_found"
