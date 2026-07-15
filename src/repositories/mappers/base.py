from typing import Any
from pydantic import BaseModel


class DataMapper:
    db_model: Any = None
    schema: type[BaseModel] | None = None

    @classmethod
    def map_to_domain_entity(cls, db_model):
        assert cls.schema is not None
        return cls.schema.model_validate(db_model, from_attributes=True)

    @classmethod
    def map_to_persistence_entity(cls, data):
        assert cls.db_model is not None
        return cls.db_model(**data.model_dump())
