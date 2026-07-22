from sqlalchemy import select, delete, insert

from src.models import FacilitiesOrm
from src.models.facilities import RoomsFacilitiesOrm
from src.exceptions import ObjectNotFoundException
from src.repositories.base import BaseRepository
from src.repositories.mappers.mappers import FacilityDataMapper, RoomFacilityDataMapper


class FacilitiesRepository(BaseRepository):
    model = FacilitiesOrm
    mapper = FacilityDataMapper

    async def get_for_update(self, facility_id: int):
        query = select(self.model).where(self.model.id == facility_id).with_for_update()
        result = await self.session.execute(query)
        model = result.scalars().one_or_none()
        if model is None:
            raise ObjectNotFoundException
        return self.mapper.map_to_domain_entity(model)


class RoomsFacilitiesRepository(BaseRepository):
    model = RoomsFacilitiesOrm
    mapper = RoomFacilityDataMapper

    async def set_room_facilities(self, facilities_ids: list[int], room_id: int):
        current_ids_facilities_query = select(RoomsFacilitiesOrm.facility_id).filter_by(room_id=room_id)
        result = await self.session.execute(current_ids_facilities_query)
        current_facilities_ids = result.scalars().all()

        ids_to_delete = list(set(current_facilities_ids) - set(facilities_ids))
        ids_to_insert = list(set(facilities_ids) - set(current_facilities_ids))

        if ids_to_delete:
            ids_to_delete_stmt = delete(RoomsFacilitiesOrm).filter(
                RoomsFacilitiesOrm.room_id == room_id, RoomsFacilitiesOrm.facility_id.in_(ids_to_delete)
            )
            await self.session.execute(ids_to_delete_stmt)

        if ids_to_insert:
            ids_to_insert_stmt = insert(RoomsFacilitiesOrm).values(
                [{"room_id": room_id, "facility_id": f_id} for f_id in ids_to_insert]
            )
            await self.session.execute(ids_to_insert_stmt)

    async def existing_ids(self, facilities_ids: list[int]) -> set[int]:
        if not facilities_ids:
            return set()

        unique_facility_ids = set(facilities_ids)
        query = select(FacilitiesOrm.id).where(FacilitiesOrm.id.in_(unique_facility_ids))
        result = await self.session.execute(query)
        return set(result.scalars().all())
