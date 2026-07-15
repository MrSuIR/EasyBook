from fastapi import APIRouter, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.api.dependencies import CurrentUserDep, DBDep, set_auth_cookie
from src.config import settings
from src.schemas.users import User, UserRequestAdd
from src.service.auth import AuthService

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Авторизация и аутентификация"])


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register_user(request: Request, db: DBDep, request_data: UserRequestAdd):
    return {"status": "OK", "data": await AuthService(db).register_user(request_data)}


@router.post("/login")
@limiter.limit("10/minute")
async def login_user(
    request: Request, db: DBDep, request_data: UserRequestAdd, response: Response
):
    set_auth_cookie(response, await AuthService(db).login_user(request_data))
    return {"status": "OK"}


@router.get("/me", response_model=User)
async def get_me(user: CurrentUserDep):
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token", httponly=True, secure=settings.cookie_secure, samesite="lax"
    )
    return {"status": "OK"}
