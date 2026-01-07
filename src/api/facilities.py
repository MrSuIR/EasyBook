from fastapi import APIRouter
from fastapi_cache.decorator import cache
from src.api.dependencies import DBDep
from src.schemas.facilities import FacilityAdd
from src.service.facilities import FacilityService

router = APIRouter(prefix="/facilities", tags=["Удобства"])


@router.get("")
@cache(expire=10)
async def get_facilities(db: DBDep):
    return await FacilityService(db).get_facilities()


@router.post("")
async def create_facility(db: DBDep, facility_data: FacilityAdd):
    facility = await FacilityService(db).add_facility(facility_data)
    await db.commit()
    return {"status": "OK", "data": facility}
