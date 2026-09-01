import pytest


@pytest.mark.asyncio
async def test_user_administration_requires_admin(client, admin_client):
    assert (await client.get("/users")).status_code == 403
    listing = await admin_client.get(
        "/users", params={"search": "петров", "sort_by": "email", "sort_order": "desc"}
    )
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["email"] == "client@example.com"


@pytest.mark.asyncio
async def test_admin_can_create_update_and_delete_user(admin_client):
    created = await admin_client.post(
        "/users",
        json={
            "email": " NEW.ADMIN@Example.com ",
            "first_name": " Мария ",
            "last_name": " Орлова ",
            "password": "password123",
            "role": "admin",
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["email"] == "new.admin@example.com"
    assert body["role"] == "admin"

    updated = await admin_client.put(
        f"/users/{body['id']}",
        json={
            "email": "new.client@example.com",
            "first_name": "Мария",
            "last_name": "Орлова",
            "role": "client",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["role"] == "client"

    deleted = await admin_client.delete(f"/users/{body['id']}")
    assert deleted.status_code == 200
    missing = await admin_client.delete(f"/users/{body['id']}")
    assert missing.status_code == 404
    assert missing.json()["code"] == "user_not_found"


@pytest.mark.asyncio
async def test_profile_update_is_scoped_to_current_user(client, admin_client):
    updated = await client.put(
        "/auth/me",
        json={
            "email": "updated@example.com",
            "first_name": "Новая",
            "last_name": "Фамилия",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["email"] == "updated@example.com"

    listing = await admin_client.get("/users", params={"search": "updated@example.com"})
    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["first_name"] == "Новая"


@pytest.mark.asyncio
async def test_duplicate_user_email_has_domain_conflict(admin_client):
    response = await admin_client.post(
        "/users",
        json={
            "email": "client@example.com",
            "first_name": "Другая",
            "last_name": "Запись",
            "password": "password123",
            "role": "client",
        },
    )
    assert response.status_code == 409
    assert response.json()["code"] == "user_already_exists"
