import asyncio
from getpass import getpass

import typer

from src.constants import UserRole
from src.database import async_session_maker_null_pool
from src.schemas.users import UserAdd, UserRequestAdd
from src.service.auth import AuthService
from src.service.demo_seed import (
    DEMO_PASSWORD,
    DemoSeedNotAllowedError,
    DemoSeedService,
)
from src.utils.db_manager import DBManager


app = typer.Typer(help="Служебные команды EasyBook")


@app.callback()
def callback() -> None:
    """Управление EasyBook из командной строки."""


async def _create_admin(email: str, first_name: str, last_name: str) -> None:
    normalized_email = email.strip().lower()
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        existing = await db.users.get_user_with_hashed_password(email=normalized_email)
        if existing:
            names_changed = (
                existing.first_name != first_name.strip()
                or existing.last_name != last_name.strip()
            )
            if existing.role != UserRole.ADMIN or names_changed:
                await db.users.edit(
                    UserAdd(
                        email=existing.email,
                        first_name=first_name,
                        last_name=last_name,
                        hashed_password=existing.hashed_password,
                        role=UserRole.ADMIN,
                    ),
                    id=existing.id,
                )
                await db.commit()
                typer.echo(f"Данные администратора {normalized_email} обновлены")
            else:
                typer.echo(f"Администратор {normalized_email} уже существует")
            return

        password = getpass("Пароль (8–72 символа): ")
        confirmation = getpass("Повторите пароль: ")
        if password != confirmation:
            raise typer.BadParameter("Пароли не совпадают")
        credentials = UserRequestAdd(
            email=normalized_email,
            first_name=first_name,
            last_name=last_name,
            password=password,
        )
        await AuthService(db).register_user(credentials, role=UserRole.ADMIN)
        typer.echo(f"Администратор {normalized_email} создан")


@app.command("create-admin")
def create_admin(
    email: str = typer.Option(..., help="Email администратора"),
    first_name: str = typer.Option(..., help="Имя администратора"),
    last_name: str = typer.Option(..., help="Фамилия администратора"),
) -> None:
    asyncio.run(_create_admin(email, first_name, last_name))


async def _seed_demo() -> None:
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        summary = await DemoSeedService(db).seed()
    typer.echo(
        "Demo data is ready: "
        f"{summary.users} users, {summary.facilities} facilities, "
        f"{summary.hotels} hotels, {summary.rooms} rooms, "
        f"{summary.bookings} bookings, {summary.reviews} reviews, "
        f"{summary.images} images"
    )
    typer.echo(f"Admin: admin@example.com / {DEMO_PASSWORD}")
    typer.echo(f"Client: client@example.com / {DEMO_PASSWORD}")
    typer.echo(f"Client: traveler@example.com / {DEMO_PASSWORD}")


@app.command("seed-demo")
def seed_demo() -> None:
    try:
        asyncio.run(_seed_demo())
    except DemoSeedNotAllowedError as ex:
        typer.echo(str(ex), err=True)
        raise typer.Exit(code=2) from ex


if __name__ == "__main__":
    app()
