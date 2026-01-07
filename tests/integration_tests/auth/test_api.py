import pytest
from src.service.auth import AuthService


@pytest.mark.parametrize(
    "email, password, status_code",
    [
        ("user@mail.ru", "12345", 200),
        ("user@mail.ru", "12345", 409),
        ("userail.ru", "12345", 422),
        ("user123@mail.ru", "12345", 200),
    ],
)
async def test_auth_flow(email: str, password: str, status_code, ac, db):
    register_response = await ac.post("/auth/register", json={"email": email, "password": password})
    assert register_response.status_code == status_code
    if status_code != 200:
        return None
    assert register_response.json()["status"] == "OK"
    user = await db.users.get_one_or_none(email=email)
    assert user
    assert user.email == email

    login_response = await ac.post("/auth/login", json={"email": email, "password": password})
    assert login_response.status_code == status_code
    if status_code != 200:
        return None
    access_token = login_response.json()["access_token"]
    payload = AuthService().decode_token(access_token)
    assert access_token
    assert payload
    assert user.id == payload["user_id"]

    auth_me_response = await ac.get("/auth/me")
    assert auth_me_response.status_code == status_code
    assert auth_me_response.json()["id"] == user.id
    assert auth_me_response.json()["email"] == email
    assert "password" not in auth_me_response.json()
    assert "hashed_password" not in auth_me_response.json()

    logout_response = await ac.post("/auth/logout")
    assert logout_response.status_code == status_code
    assert logout_response.json()["status"] == "OK"
    assert "access_token" not in ac.cookies
