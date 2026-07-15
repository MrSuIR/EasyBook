from src.utils.db_manager import DBManager
from typing import Any


class BaseService:
    db: Any

    def __init__(self, db: DBManager | None = None):
        self.db = db
