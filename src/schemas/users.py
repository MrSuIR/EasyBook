from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator
from src.constants import UserRole


UserName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


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


class UserAdd(BaseModel):
    email: EmailStr
    first_name: UserName
    last_name: UserName
    hashed_password: str
    role: UserRole = UserRole.CLIENT


class User(BaseModel):
    id: int
    email: EmailStr
    first_name: UserName
    last_name: UserName
    role: UserRole


class UserWithHashedPassword(User):
    hashed_password: str


class UserRolePatch(BaseModel):
    role: UserRole
