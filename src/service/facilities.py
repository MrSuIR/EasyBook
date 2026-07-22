from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from src.exceptions import FacilityImageNotFoundException, FacilityNotFoundException, ObjectNotFoundException
from src.schemas.facilities import FacilityAdd, FacilityImagePathPatch
from src.service.base import BaseService
from src.service.image_storage import remove_image_file, write_image_file
from src.service.image_validation import validate_image_upload


FACILITY_IMAGE_DIMENSIONS = (38, 38)


class FacilityService(BaseService):
    async def get_facilities(self):
        return await self.db.facilities.get_all()

    async def add_facility(self, facility_data: FacilityAdd):
        facility = await self.db.facilities.add(data=facility_data)
        await self.db.commit()
        return facility

    async def edit_facility(self, facility_id: int, facility_data: FacilityAdd):
        try:
            facility = await self.db.facilities.edit(data=facility_data, id=facility_id)
        except ObjectNotFoundException as ex:
            raise FacilityNotFoundException from ex
        await self.db.commit()
        return facility

    async def delete_facility(self, facility_id: int):
        facility = await self._get_facility_for_update(facility_id)
        try:
            await self.db.facilities.delete(id=facility_id)
        except ObjectNotFoundException as ex:
            raise FacilityNotFoundException from ex
        await self.db.commit()
        if facility.image_path is not None:
            await remove_image_file(facility.image_path)

    async def upload_image(self, facility_id: int, file: UploadFile):
        facility = await self._get_facility(facility_id)
        validated = await validate_image_upload(file, required_dimensions=FACILITY_IMAGE_DIMENSIONS)
        relative_path = Path("facilities") / str(facility_id) / f"{uuid4()}{validated.extension}"
        await write_image_file(relative_path, validated.content)
        try:
            facility = await self._get_facility_for_update(facility_id)
            updated = await self.db.facilities.edit(
                data=FacilityImagePathPatch(image_path=relative_path.as_posix()), id=facility_id
            )
            await self.db.commit()
        except Exception:
            await remove_image_file(relative_path)
            raise

        if facility.image_path is not None:
            await remove_image_file(facility.image_path)
        return updated

    async def delete_image(self, facility_id: int) -> None:
        facility = await self._get_facility_for_update(facility_id)
        if facility.image_path is None:
            raise FacilityImageNotFoundException

        await self.db.facilities.edit(data=FacilityImagePathPatch(image_path=None), id=facility_id)
        await self.db.commit()
        await remove_image_file(facility.image_path)

    async def _get_facility(self, facility_id: int):
        try:
            return await self.db.facilities.get_one(id=facility_id)
        except ObjectNotFoundException as ex:
            raise FacilityNotFoundException from ex

    async def _get_facility_for_update(self, facility_id: int):
        try:
            return await self.db.facilities.get_for_update(facility_id)
        except ObjectNotFoundException as ex:
            raise FacilityNotFoundException from ex
