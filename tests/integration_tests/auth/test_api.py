
async def test_auth_flow(ac, db):
    email = "user@mail.ru"
    password = "12345"
    status_code = 200
    register_response = await ac.post(
        "/auth/register",
        json={"email": email, "password": password}
    )
