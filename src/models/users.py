from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import CheckConstraint, String, UniqueConstraint
from src.constants import UserRole


class UsersOrm(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        CheckConstraint("role IN ('client', 'admin')", name="ck_users_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320))
    hashed_password: Mapped[str]
    role: Mapped[str] = mapped_column(
        String(20), default=UserRole.CLIENT.value, server_default=UserRole.CLIENT.value
    )
