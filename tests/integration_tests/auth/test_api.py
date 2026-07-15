import pytest


@pytest.mark.asyncio
async def test_register_login_me_logout(anonymous_client):
    response = await anonymous_client.post(
        "/auth/register",
        json={"email": "  NEW@Example.COM ", "password": "strongpass"},
    )
    assert response.status_code == 201
    assert response.json()["data"]["role"] == "client"

    response = await anonymous_client.post(
        "/auth/login",
        json={"email": "new@example.com", "password": "strongpass"},
    )
    assert response.status_code == 200
    assert "access_token" not in response.json()
    assert anonymous_client.cookies.get("access_token")

    me = await anonymous_client.get("/auth/me")
    assert me.json()["email"] == "new@example.com"
    assert me.json()["role"] == "client"

    await anonymous_client.post("/auth/logout")
    assert (await anonymous_client.get("/auth/me")).status_code == 401


@pytest.mark.asyncio
async def test_password_limits_and_role_injection(anonymous_client):
    short = await anonymous_client.post(
        "/auth/register", json={"email": "short@example.com", "password": "123"}
    )
    assert short.status_code == 422
    injected = await anonymous_client.post(
        "/auth/register",
        json={
            "email": "role@example.com",
            "password": "password123",
            "role": "admin",
        },
    )
    assert injected.status_code == 422
    assert injected.json()["code"] == "validation_error"


@pytest.mark.asyncio
async def test_broken_cookie_is_unauthorized(anonymous_client):
    anonymous_client.cookies.set("access_token", "broken")
    response = await anonymous_client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_token"


@pytest.mark.asyncio
async def test_login_rate_limit(anonymous_client):
    payload = {"email": "nobody@example.com", "password": "password123"}
    responses = [
        await anonymous_client.post("/auth/login", json=payload) for _ in range(11)
    ]
    assert responses[-1].status_code == 429
    assert responses[-1].json()["code"] == "rate_limit_exceeded"
