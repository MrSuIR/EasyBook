from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from src.config import settings
from src.constants import UserRole
from src.exceptions import (
    IncorrectTokenException,
    LoginFailedException,
    ObjectAlreadyExistException,
    UserAlreadyExistsException,
)
from src.schemas.users import UserAdd, UserRequestAdd
from src.service.base import BaseService


class AuthService(BaseService):
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, user_id: int) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return jwt.encode(
            {"sub": str(user_id), "exp": expire}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )

    def hashed_password(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def decode_token(self, token: str) -> int:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return int(payload["sub"])
        except (KeyError, TypeError, ValueError, jwt.exceptions.InvalidTokenError) as ex:
            raise IncorrectTokenException from ex

    async def register_user(self, request_data: UserRequestAdd, role: UserRole = UserRole.CLIENT):
        try:
            user = await self.db.users.add(
                UserAdd(
                    email=str(request_data.email).lower(),
                    hashed_password=self.hashed_password(request_data.password),
                    role=role,
                )
            )
        except ObjectAlreadyExistException as ex:
            raise UserAlreadyExistsException from ex
        await self.db.commit()
        return user

    async def login_user(self, request_data: UserRequestAdd) -> str:
        user = await self.db.users.get_user_with_hashed_password(email=str(request_data.email).lower())
        if user is None:
            raise LoginFailedException

        password_is_valid = self.verify_password(request_data.password, user.hashed_password)
        if not password_is_valid:
            raise LoginFailedException

        return self.create_access_token(user.id)

    async def get_me(self, user_id: int):
        return await self.db.users.get_one(id=user_id)
