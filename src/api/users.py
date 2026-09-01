from fastapi import APIRouter

from src.api.dependencies import AdminUserDep, DBDep, PaginationDep
from src.schemas.common import PaginatedResponse, SortOrder
from src.schemas.users import User, UserAdminCreate, UserAdminUpdate, UserSortBy
from src.service.users import UserService


router = APIRouter(prefix="/users", tags=["Пользователи"])


@router.get("", response_model=PaginatedResponse[User])
async def get_users(
    db: DBDep,
    pagination: PaginationDep,
    _: AdminUserDep,
    search: str | None = None,
    sort_by: UserSortBy | None = None,
    sort_order: SortOrder | None = None,
):
    items, total = await UserService(db).get_users(
        pagination.page,
        pagination.per_page,
        search,
        sort_by,
        sort_order,
    )
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
    )


@router.post("", response_model=User, status_code=201)
async def create_user(data: UserAdminCreate, db: DBDep, _: AdminUserDep):
    return await UserService(db).add_user(data)


@router.put("/{user_id}", response_model=User)
async def edit_user(
    user_id: int, data: UserAdminUpdate, db: DBDep, _: AdminUserDep
):
    return await UserService(db).edit_user(user_id, data)


@router.delete("/{user_id}")
async def delete_user(user_id: int, db: DBDep, _: AdminUserDep):
    await UserService(db).delete_user(user_id)
    return {"status": "OK"}
