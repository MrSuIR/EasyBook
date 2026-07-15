from fastapi import APIRouter

from src.api.dependencies import CurrentUserDep, DBDep, PaginationDep
from src.schemas.common import PaginatedResponse
from src.schemas.reviews import Review, ReviewCreate, ReviewPatch, ReviewPublic
from src.service.reviews import ReviewService


router = APIRouter(tags=["Отзывы"])


@router.get(
    "/hotels/{hotel_id}/reviews",
    response_model=PaginatedResponse[ReviewPublic],
)
async def get_hotel_reviews(
    hotel_id: int, db: DBDep, pagination: PaginationDep
):
    items, total = await ReviewService(db).get_hotel_reviews(
        hotel_id, pagination.page, pagination.per_page
    )
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
    )


@router.get("/reviews/me", response_model=list[Review])
async def get_my_reviews(db: DBDep, user: CurrentUserDep):
    return await ReviewService(db).get_my_reviews(user.id)


@router.get("/reviews/{review_id}", response_model=Review)
async def get_review(review_id: int, db: DBDep, user: CurrentUserDep):
    return await ReviewService(db).get_review(review_id, user)


@router.post("/reviews", response_model=Review, status_code=201)
async def create_review(data: ReviewCreate, db: DBDep, user: CurrentUserDep):
    return await ReviewService(db).add_review(data, user)


@router.patch("/reviews/{review_id}", response_model=Review)
async def patch_review(
    review_id: int, data: ReviewPatch, db: DBDep, user: CurrentUserDep
):
    return await ReviewService(db).edit_review(review_id, data, user)


@router.delete("/reviews/{review_id}")
async def delete_review(review_id: int, db: DBDep, user: CurrentUserDep):
    await ReviewService(db).delete_review(review_id, user)
    return {"status": "OK"}
