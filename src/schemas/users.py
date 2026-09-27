from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator
from src.constants import UserRole


UserName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class UserSortBy(StrEnum):
    ID = "id"
    EMAIL = "email"
    FIRST_NAME = "first_name"
    LAST_NAME = "last_name"
    ROLE = "role"


class UserCredentials(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserRequestAdd(UserCredentials):
    first_name: UserName
    last_name: UserName


class UserLogin(UserCredentials):
    pass


class UserAdminCreate(UserRequestAdd):
    role: UserRole = UserRole.CLIENT


class UserAdminUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    first_name: UserName
    last_name: UserName
    role: UserRole
    password: str | None = Field(default=None, min_length=8, max_length=72)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    first_name: UserName
    last_name: UserName

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserAdd(BaseModel):
    email: EmailStr
    first_name: UserName
    last_name: UserName
    hashed_password: str
    role: UserRole = UserRole.CLIENT


class UserPatch(BaseModel):
    email: EmailStr | None = None
    first_name: UserName | None = None
    last_name: UserName | None = None
    hashed_password: str | None = None
    role: UserRole | None = None


class User(BaseModel):
    id: int
    email: EmailStr
    first_name: UserName
    last_name: UserName
    role: UserRole


class UserWithHashedPassword(User):
    hashed_password: str
