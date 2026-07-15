from src.exceptions import FacilityNotFoundException, ObjectNotFoundException
from src.schemas.facilities import FacilityAdd
from src.service.base import BaseService


class FacilityService(BaseService):
    async def get_facilities(self):
        return await self.db.facilities.get_all()

    async def add_facility(self, facility_data: FacilityAdd):
        facility = await self.db.facilities.add(data=facility_data)
        await self.db.commit()
        return facility

    async def edit_facility(self, facility_id: int, facility_data: FacilityAdd):
        try:
            facility = await self.db.facilities.edit(
                data=facility_data, id=facility_id
            )
        except ObjectNotFoundException as ex:
            raise FacilityNotFoundException from ex
        await self.db.commit()
        return facility

    async def delete_facility(self, facility_id: int):
        try:
            await self.db.facilities.delete(id=facility_id)
        except ObjectNotFoundException as ex:
            raise FacilityNotFoundException from ex
        await self.db.commit()
