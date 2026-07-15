import uvicorn
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.api.auth import limiter, router as router_auth
from src.api.bookings import router as router_bookings
from src.api.facilities import router as router_facilities
from src.api.hotels import router as router_hotels
from src.api.images import router as router_images
from src.api.rooms import router as router_rooms
from src.config import settings
from src.database import engine
from src.exceptions import EasyBookException


settings.IMAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="EasyBook API", version="2.0.0")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(_, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"code": "rate_limit_exceeded", "detail": str(exc.detail)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=jsonable_encoder({"code": "validation_error", "detail": exc.errors()}),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_, exc: StarletteHTTPException):
    codes = {
        400: "bad_request",
        401: "authentication_required",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": codes.get(exc.status_code, "http_error"),
            "detail": str(exc.detail),
        },
        headers=exc.headers,
    )


@app.exception_handler(EasyBookException)
async def easybook_exception_handler(_, exc: EasyBookException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.code, "detail": exc.detail},
    )


@app.get("/health/live", include_in_schema=False)
async def health_live():
    return {"status": "ok"}


@app.get("/health/ready", include_in_schema=False)
async def health_ready():
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(router_auth)
app.include_router(router_hotels)
app.include_router(router_rooms)
app.include_router(router_bookings)
app.include_router(router_facilities)
app.include_router(router_images)
app.mount("/static/images", StaticFiles(directory=settings.IMAGE_DIR), name="images")


if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000)
