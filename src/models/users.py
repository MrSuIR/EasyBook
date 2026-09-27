from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import CheckConstraint, String, UniqueConstraint
from src.constants import UserRole


class UsersOrm(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        CheckConstraint("role IN ('client', 'admin')", name="ck_users_role"),
        CheckConstraint(
            "char_length(email) BETWEEN 3 AND 320 AND email = lower(btrim(email))",
            name="ck_users_email_normalized",
        ),
        CheckConstraint(
            "char_length(first_name) BETWEEN 1 AND 100 "
            "AND first_name ~ '[^[:space:]]'",
            name="ck_users_first_name_valid",
        ),
        CheckConstraint(
            "char_length(last_name) BETWEEN 1 AND 100 "
            "AND last_name ~ '[^[:space:]]'",
            name="ck_users_last_name_valid",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320))
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str]
    role: Mapped[str] = mapped_column(String(20), default=UserRole.CLIENT.value, server_default=UserRole.CLIENT.value)
