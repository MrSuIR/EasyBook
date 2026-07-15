import pytest


@pytest.mark.asyncio
async def test_facility_mutations_require_admin(anonymous_client, client, admin_client):
    payload = {"title": "Breakfast"}
    assert (await anonymous_client.post("/facilities", json=payload)).status_code == 401
    assert (await client.post("/facilities", json=payload)).status_code == 403
    created = await admin_client.post("/facilities", json=payload)
    assert created.status_code == 201
    assert (
        await admin_client.delete(f"/facilities/{created.json()['id']}")
    ).status_code == 200
