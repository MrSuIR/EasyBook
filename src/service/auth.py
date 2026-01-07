import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from src.config import settings
from src.exceptions import ObjectAlreadyExistException, UserAlreadyExistsException, LoginFailedException, \
    IncorrectTokenException
from src.schemas.users import UserRequestAdd, UserAdd
from src.service.base import BaseService


class AuthService(BaseService):
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def verify_password(self, plain_password, hashed_password):
        return self.pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )
        return encoded_jwt

    def hashed_password(self, password: str):
        return self.pwd_context.hash(password)

    def decode_token(self, token: str):
        try:
            return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.exceptions.DecodeError:
            raise IncorrectTokenException

    async def register_user(self, request_data: UserRequestAdd):
        hashed_password = self.hashed_password(password=request_data.password)
        user_data = UserAdd(email=request_data.email, hashed_password=hashed_password)
        try:
            await self.db.users.add(data=user_data)
        except ObjectAlreadyExistException:
            raise UserAlreadyExistsException
        await self.db.commit()

    async def login_user(self, request_data: UserRequestAdd):
        user = await self.db.users.get_user_with_hashed_password(email=request_data.email)
        if not user or not AuthService().verify_password(
                plain_password=request_data.password, hashed_password=user.hashed_password
        ):
            raise LoginFailedException
        access_token = AuthService().create_access_token({"user_id": user.id})
        return access_token

    async def get_me(self, user_id: int):
        return await self.db.users.get_one_or_none(id=user_id)