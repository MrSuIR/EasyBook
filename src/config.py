from pathlib import Path
from typing import Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MODE: Literal["TEST", "LOCAL", "DEV", "PROD"]

    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASS: str
    DB_NAME: str

    @property
    def DB_URL(self):
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    TIMEZONE: str = "Europe/Moscow"
    IMAGE_DIR: Path = Path("src/static/images")
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024
    IMPORT_REMOTE_DEMO_CATALOG: bool = False
    GEOAPIFY_API_KEY: str | None = None
    COOKIE_SECURE: bool | None = None

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.MODE == "PROD":
            unsafe_secrets = {
                "change-this-secret-in-production",
                "replace-with-a-long-random-secret",
                "local-development-secret-change-before-production",
            }
            if len(self.JWT_SECRET_KEY.strip()) < 32 or self.JWT_SECRET_KEY in unsafe_secrets:
                raise ValueError(
                    "JWT_SECRET_KEY must contain at least 32 non-default characters in PROD"
                )
        return self

    @property
    def cookie_secure(self) -> bool:
        if self.MODE == "PROD":
            return True
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()  # pyright: ignore[reportCallIssue]
