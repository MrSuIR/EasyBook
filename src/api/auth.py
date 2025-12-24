from fastapi import APIRouter, HTTPException, Response
from src.api.dependencies import UserIdDep
from src.database import async_session_maker
from src.repositories.users import UsersRepository
from src.schemas.users import UserRequestAdd, UserAdd
from src.service.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Авторизация и аутентификация"])

@router.post("/register")
async def register_user(request_data: UserRequestAdd):
    hashed_password = AuthService().hashed_password(password=request_data.password)
    user_data = UserAdd(email=request_data.email, hashed_password=hashed_password)
    async with async_session_maker() as session:
        await UsersRepository(session).add(data=user_data)
        await session.commit()
    return {"status": "OK"}


@router.post("/login")
async def login_user(
        request_data: UserRequestAdd,
        response: Response
):
    async with async_session_maker() as session:
        user = await UsersRepository(session).get_user_with_hashed_password(email=request_data.email)
        if not user or not AuthService().verify_password(plain_password=request_data.password, hashed_password=user.hashed_password):
            raise HTTPException(status_code=401, detail="Неверный логин или пароль")
        access_token = AuthService().create_access_token({"user_id": user.id})
        response.set_cookie("access_token", access_token)
        return {"access_token": access_token}


@router.get("/me")
async def get_me(user_id: UserIdDep):
    async with async_session_maker() as session:
        return await UsersRepository(session).get_one_or_none(id=user_id)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"status": "OK"}


