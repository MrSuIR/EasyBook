from sqlalchemy import func, or_, select
from pydantic import EmailStr

from src.models import UsersOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import UserDataMapper
from src.schemas.users import UserWithHashedPassword
from src.schemas.common import SortOrder
from src.schemas.users import UserSortBy
from src.repositories.utils import sort_expression


class UsersRepository(BaseRepository):
    model = UsersOrm
    mapper = UserDataMapper

    async def get_user_with_hashed_password(self, email: EmailStr):
        query = select(self.model).filter_by(email=email)
        result = await self.session.execute(query)
        model = result.scalars().one_or_none()
        if model is None:
            return None
        return UserWithHashedPassword.model_validate(model, from_attributes=True)

    async def get_paginated(
        self,
        limit: int,
        offset: int,
        sort_by: UserSortBy,
        sort_order: SortOrder,
        search: str | None = None,
    ):
        query = select(self.model)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    self.model.email.ilike(pattern),
                    self.model.first_name.ilike(pattern),
                    self.model.last_name.ilike(pattern),
                )
            )
        total = (
            await self.session.execute(select(func.count()).select_from(query.subquery()))
        ).scalar_one()
        sort_columns = {
            UserSortBy.ID: self.model.id,
            UserSortBy.EMAIL: self.model.email,
            UserSortBy.FIRST_NAME: self.model.first_name,
            UserSortBy.LAST_NAME: self.model.last_name,
            UserSortBy.ROLE: self.model.role,
        }
        query = query.order_by(sort_expression(sort_columns[sort_by], sort_order))
        if sort_by != UserSortBy.ID:
            query = query.order_by(sort_expression(self.model.id, sort_order))
        result = await self.session.execute(query.limit(limit).offset(offset))
        return [self.mapper.map_to_domain_entity(item) for item in result.scalars().all()], total
