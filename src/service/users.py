from src.exceptions import (
    ObjectAlreadyExistException,
    ObjectNotFoundException,
    UserAlreadyExistsException,
    UserNotFoundException,
)
from src.schemas.common import SortOrder
from src.schemas.users import (
    UserAdd,
    UserAdminCreate,
    UserAdminUpdate,
    UserPatch,
    UserProfileUpdate,
    UserSortBy,
)
from src.service.auth import AuthService
from src.service.base import BaseService


class UserService(BaseService):
    async def get_users(
        self,
        page: int,
        per_page: int,
        search: str | None = None,
        sort_by: UserSortBy | None = None,
        sort_order: SortOrder | None = None,
    ):
        return await self.db.users.get_paginated(
            limit=per_page,
            offset=per_page * (page - 1),
            search=search,
            sort_by=sort_by or UserSortBy.ID,
            sort_order=sort_order or SortOrder.ASC,
        )

    async def add_user(self, data: UserAdminCreate):
        try:
            user = await self.db.users.add(
                UserAdd(
                    email=data.email,
                    first_name=data.first_name,
                    last_name=data.last_name,
                    hashed_password=AuthService().hashed_password(data.password),
                    role=data.role,
                )
            )
        except ObjectAlreadyExistException as ex:
            raise UserAlreadyExistsException from ex
        await self.db.commit()
        return user

    async def edit_user(self, user_id: int, data: UserAdminUpdate):
        values = {
            "email": data.email,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "role": data.role,
        }
        if data.password is not None:
            values["hashed_password"] = AuthService().hashed_password(data.password)
        return await self._edit(user_id, UserPatch(**values))

    async def edit_profile(self, user_id: int, data: UserProfileUpdate):
        return await self._edit(
            user_id,
            UserPatch(
                email=data.email,
                first_name=data.first_name,
                last_name=data.last_name,
            ),
        )

    async def delete_user(self, user_id: int):
        try:
            await self.db.users.delete(id=user_id)
        except ObjectNotFoundException as ex:
            raise UserNotFoundException from ex
        await self.db.commit()

    async def _edit(self, user_id: int, data: UserPatch):
        try:
            user = await self.db.users.edit(data=data, id=user_id, exclude_unset=True)
        except ObjectAlreadyExistException as ex:
            raise UserAlreadyExistsException from ex
        except ObjectNotFoundException as ex:
            raise UserNotFoundException from ex
        await self.db.commit()
        return user
