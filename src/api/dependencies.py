from typing import Annotated
from fastapi import Depends, Query, Request
from pydantic import BaseModel
from src.config import settings
from src.constants import UserRole
from src.database import async_session_maker
from src.exceptions import (
    AuthenticationRequiredException,
    ForbiddenException,
    IncorrectTokenException,
    ObjectNotFoundException,
)
from src.schemas.users import User
from src.service.auth import AuthService
from src.utils.db_manager import DBManager


class PaginationParams(BaseModel):
    page: Annotated[int, Query(default=1, ge=1)] = 1
    per_page: Annotated[int, Query(default=10, ge=1, le=100)] = 10


PaginationDep = Annotated[PaginationParams, Depends()]


def get_token(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise AuthenticationRequiredException
    return token


async def get_db():
    async with DBManager(session_factory=async_session_maker) as db:
        yield db


DBDep = Annotated[DBManager, Depends(get_db)]


async def get_current_user(db: DBDep, token: str = Depends(get_token)) -> User:
    try:
        return await db.users.get_one(id=AuthService().decode_token(token))
    except (IncorrectTokenException, ObjectNotFoundException) as ex:
        raise IncorrectTokenException from ex


CurrentUserDep = Annotated[User, Depends(get_current_user)]


async def get_admin_user(user: CurrentUserDep) -> User:
    if user.role != UserRole.ADMIN:
        raise ForbiddenException
    return user


AdminUserDep = Annotated[User, Depends(get_admin_user)]


def set_auth_cookie(response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
