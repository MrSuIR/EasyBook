from uuid import UUID

from fastapi import APIRouter, Response, UploadFile, status

from src.api.dependencies import AdminUserDep, DBDep
from src.schemas.images import HotelImageResponse
from src.service.images import ImageService


router = APIRouter(prefix="/hotels", tags=["Изображения отелей"])


@router.get("/{hotel_id}/images", response_model=list[HotelImageResponse])
async def get_images(hotel_id: int, db: DBDep):
    return await ImageService(db).get_images(hotel_id)


@router.post("/{hotel_id}/images", response_model=HotelImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(hotel_id: int, file: UploadFile, db: DBDep, _: AdminUserDep):
    return await ImageService(db).upload_image(hotel_id, file)


@router.delete("/{hotel_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(hotel_id: int, image_id: UUID, db: DBDep, _: AdminUserDep):
    await ImageService(db).delete_image(hotel_id, image_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
