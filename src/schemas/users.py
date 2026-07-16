from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from src.constants import UserRole


class UserRequestAdd(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserAdd(BaseModel):
    email: EmailStr
    hashed_password: str
    role: UserRole = UserRole.CLIENT


class User(BaseModel):
    id: int
    email: EmailStr
    role: UserRole


class UserWithHashedPassword(User):
    hashed_password: str


class UserRolePatch(BaseModel):
    role: UserRole
