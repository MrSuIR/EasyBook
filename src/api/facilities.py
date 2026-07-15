from fastapi import APIRouter
from src.api.dependencies import AdminUserDep, DBDep
from src.schemas.facilities import Facility, FacilityAdd
from src.service.facilities import FacilityService

router = APIRouter(prefix="/facilities", tags=["Удобства"])


@router.get("", response_model=list[Facility])
async def get_facilities(db: DBDep):
    return await FacilityService(db).get_facilities()


@router.post("", response_model=Facility, status_code=201)
async def create_facility(db: DBDep, facility_data: FacilityAdd, _: AdminUserDep):
    return await FacilityService(db).add_facility(facility_data)


@router.put("/{facility_id}", response_model=Facility)
async def edit_facility(
    facility_id: int, facility_data: FacilityAdd, db: DBDep, _: AdminUserDep
):
    return await FacilityService(db).edit_facility(facility_id, facility_data)


@router.delete("/{facility_id}")
async def delete_facility(facility_id: int, db: DBDep, _: AdminUserDep):
    await FacilityService(db).delete_facility(facility_id)
    return {"status": "OK"}
