import asyncio
from getpass import getpass

import typer

from src.constants import UserRole
from src.database import async_session_maker_null_pool
from src.schemas.users import UserRequestAdd, UserRolePatch
from src.service.auth import AuthService
from src.utils.db_manager import DBManager


app = typer.Typer(help="Служебные команды EasyBook")


@app.callback()
def callback() -> None:
    """Управление EasyBook из командной строки."""


async def _create_admin(email: str) -> None:
    normalized_email = email.strip().lower()
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        existing = await db.users.get_user_with_hashed_password(email=normalized_email)
        if existing:
            if existing.role != UserRole.ADMIN:
                await db.users.edit(UserRolePatch(role=UserRole.ADMIN), id=existing.id)
                await db.commit()
                typer.echo(f"Пользователь {normalized_email} повышен до администратора")
            else:
                typer.echo(f"Администратор {normalized_email} уже существует")
            return

        password = getpass("Пароль (8–72 символа): ")
        confirmation = getpass("Повторите пароль: ")
        if password != confirmation:
            raise typer.BadParameter("Пароли не совпадают")
        credentials = UserRequestAdd(email=normalized_email, password=password)
        await AuthService(db).register_user(credentials, role=UserRole.ADMIN)
        typer.echo(f"Администратор {normalized_email} создан")


@app.command("create-admin")
def create_admin(email: str = typer.Option(..., help="Email администратора")) -> None:
    asyncio.run(_create_admin(email))


if __name__ == "__main__":
    app()
