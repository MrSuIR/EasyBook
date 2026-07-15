from collections.abc import Sequence
from typing import Any
from sqlalchemy import delete, func, insert, select, update
from pydantic import BaseModel
from sqlalchemy.exc import NoResultFound, IntegrityError

from src.exceptions import (
    ObjectNotFoundException,
    ObjectAlreadyExistException,
    ObjectIntegrityException,
)


class BaseRepository:
    model: Any = None
    mapper: Any = None

    def __init__(self, session):
        self.session = session

    async def get_filtered(self, *filter, **filter_by):
        query = select(self.model).filter(*filter).filter_by(**filter_by)
        result = await self.session.execute(query)
        return [
            self.mapper.map_to_domain_entity(model) for model in result.scalars().all()
        ]

    async def get_all(self, *args, **kwargs):
        return await self.get_filtered()

    async def count(self, *filter, **filter_by) -> int:
        query = (
            select(func.count())
            .select_from(self.model)
            .filter(*filter)
            .filter_by(**filter_by)
        )
        return (await self.session.execute(query)).scalar_one()

    async def get_one(self, **filter_by):
        query = select(self.model).filter_by(**filter_by)
        result = await self.session.execute(query)
        try:
            model = result.scalars().one()
        except NoResultFound:
            raise ObjectNotFoundException
        return self.mapper.map_to_domain_entity(model)

    async def get_one_or_none(self, **filter_by):
        query = select(self.model).filter_by(**filter_by)
        result = await self.session.execute(query)
        model = result.scalars().one_or_none()
        if model is None:
            return None
        return self.mapper.map_to_domain_entity(model)

    async def add(self, data: BaseModel):
        add_stmt = insert(self.model).values(**data.model_dump()).returning(self.model)
        try:
            result = await self.session.execute(add_stmt)
        except IntegrityError as ex:
            if getattr(ex.orig, "sqlstate", None) == "23505":
                raise ObjectAlreadyExistException from ex
            raise ObjectIntegrityException from ex
        model = result.scalars().one_or_none()
        return self.mapper.map_to_domain_entity(model)

    async def add_bulk(self, data: Sequence[BaseModel]):
        if not data:
            return
        add_stmt = insert(self.model).values([item.model_dump() for item in data])
        try:
            await self.session.execute(add_stmt)
        except IntegrityError as ex:
            raise ObjectIntegrityException from ex

    async def edit(self, data: BaseModel, exclude_unset: bool = False, **filter_by):
        edit_stmt = (
            update(self.model)
            .filter_by(**filter_by)
            .values(**data.model_dump(exclude_unset=exclude_unset))
            .returning(self.model)
        )
        try:
            result = await self.session.execute(edit_stmt)
        except IntegrityError as ex:
            raise ObjectIntegrityException from ex
        model = result.scalars().one_or_none()
        if model is None:
            raise ObjectNotFoundException
        return self.mapper.map_to_domain_entity(model)

    async def delete(self, **filter_by):
        delete_stmt = delete(self.model).filter_by(**filter_by).returning(self.model.id)
        try:
            result = await self.session.execute(delete_stmt)
        except IntegrityError as ex:
            raise ObjectIntegrityException from ex
        if result.scalar_one_or_none() is None:
            raise ObjectNotFoundException
