from fastapi import APIRouter, Response
from src.api.dependencies import UserIdDep, DBDep
from src.exceptions import UserAlreadyExistsException, UserAlreadyExistsHTTPException, \
    LoginFailedException, LoginFailedHTTPException
from src.schemas.users import UserRequestAdd
from src.service.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Авторизация и аутентификация"])


@router.post("/register")
async def register_user(db: DBDep, request_data: UserRequestAdd):
    try:
        await AuthService(db).register_user(request_data=request_data)
    except UserAlreadyExistsException:
        raise UserAlreadyExistsHTTPException
    return {"status": "OK"}


@router.post("/login")
async def login_user(db: DBDep, request_data: UserRequestAdd, response: Response):
    try:
        access_token = await AuthService(db).login_user(request_data=request_data)
    except LoginFailedException:
        raise LoginFailedHTTPException
    response.set_cookie("access_token", access_token)
    return {"access_token": access_token}


@router.get("/me")
async def get_me(db: DBDep, user_id: UserIdDep):
    return await AuthService(db).get_me(user_id=user_id)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"status": "OK"}
