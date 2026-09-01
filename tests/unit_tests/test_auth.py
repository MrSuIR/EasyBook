from datetime import datetime, timedelta, timezone

import jwt
import pytest

from src.config import Settings, settings
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


def production_settings(secret: str, cookie_secure: bool | None = None) -> Settings:
    return Settings(  # pyright: ignore[reportCallIssue]
        MODE="PROD",
        DB_NAME="easybook",
        DB_HOST="db",
        DB_PORT=5432,
        DB_USER="easybook",
        DB_PASS="easybook",
        JWT_SECRET_KEY=secret,
        COOKIE_SECURE=cookie_secure,
    )


def test_production_rejects_weak_secret_and_forces_secure_cookie():
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        production_settings("short-secret")

    configured = production_settings("a" * 32, cookie_secure=False)
    assert configured.cookie_secure is True
