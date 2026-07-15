from src.models import HotelImagesOrm
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import HotelImageDataMapper


class HotelImagesRepository(BaseRepository):
    model = HotelImagesOrm
    mapper = HotelImageDataMapper
