from datetime import datetime, timedelta, timezone

import jwt
import pytest

from fastapi import Response

from src.api.dependencies import set_auth_cookie
from src.config import settings
from src.exceptions import IncorrectTokenException
from src.service.auth import AuthService


def test_token_roundtrip():
    service = AuthService()
    assert service.decode_token(service.create_access_token(42)) == 42


@pytest.mark.parametrize(
    "token",
    [
        "damaged.token",
        jwt.encode(
            {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        ),
    ],
)
def test_invalid_or_expired_token(token):
    with pytest.raises(IncorrectTokenException):
        AuthService().decode_token(token)


def test_auth_cookie_is_always_secure():
    response = Response()

    set_auth_cookie(response, "test-token")

    cookie_header = response.headers["set-cookie"].lower()
    assert "secure" in cookie_header
    assert "httponly" in cookie_header
