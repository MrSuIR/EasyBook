from sqlalchemy import select

from src.exceptions import ObjectNotFoundException
from src.models import HotelImagesOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import HotelImageDataMapper


class HotelImagesRepository(BaseRepository):
    model = HotelImagesOrm
    mapper = HotelImageDataMapper

    async def get_for_update(self, image_id, hotel_id: int):
        query = (
            select(self.model)
            .where(self.model.id == image_id, self.model.hotel_id == hotel_id)
            .with_for_update()
        )
        model = (await self.session.execute(query)).scalars().one_or_none()
        if model is None:
            raise ObjectNotFoundException
        return self.mapper.map_to_domain_entity(model)
