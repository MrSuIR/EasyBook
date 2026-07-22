from datetime import date

import pytest

from src.constants import BookingStatus
from src.database import async_session_maker_null_pool
from src.schemas.bookings import BookingAdd
from src.schemas.hotels import HotelAdd
from src.schemas.reviews import ReviewAdd
from src.schemas.rooms import RoomAdd
from src.utils.db_manager import DBManager


PERIOD_START = date(2026, 1, 1)
PERIOD_END = date(2026, 2, 1)


async def seed_analytics_data(clean_database):
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        user = await db.users.get_user_with_hashed_password(email="client@example.com")
        assert user is not None
        second_hotel = await db.hotels.add(HotelAdd(title="Empty Hotel", location="Kazan"))
        third_hotel = await db.hotels.add(HotelAdd(title="Another Empty Hotel", location="Sochi"))
        await db.rooms.add(
            RoomAdd(
                hotel_id=second_hotel.id,
                title="Empty Room",
                description="Номер без бронирований для проверки аналитики",
                price=1000,
                quantity=1,
            )
        )

        bookings = []
        for date_from, date_to, price, status in (
            (date(2025, 12, 30), date(2026, 1, 3), 100, BookingStatus.CONFIRMED),
            (date(2026, 1, 10), date(2026, 1, 12), 200, BookingStatus.CONFIRMED),
            (date(2026, 1, 31), date(2026, 2, 3), 300, BookingStatus.CONFIRMED),
            (date(2026, 1, 20), date(2026, 1, 22), 999, BookingStatus.CANCELLED),
        ):
            bookings.append(
                await db.bookings.add(
                    BookingAdd(
                        room_id=clean_database["room_id"],
                        user_id=user.id,
                        date_from=date_from,
                        date_to=date_to,
                        price=price,
                        status=status,
                    )
                )
            )
        for booking, rating in zip(bookings[:3], (5, 3, 1), strict=True):
            await db.reviews.add(ReviewAdd(booking_id=booking.id, rating=rating, comment="Отзыв"))
        await db.commit()
        return second_hotel.id, third_hotel.id


@pytest.mark.asyncio
async def test_hotel_analytics_access(anonymous_client, client, admin_client):
    assert (await anonymous_client.get("/analytics/hotels")).status_code == 401
    assert (await client.get("/analytics/hotels")).status_code == 403
    assert (await admin_client.get("/analytics/hotels")).status_code == 200


@pytest.mark.asyncio
async def test_hotel_analytics_period_metrics_and_empty_hotels(admin_client, clean_database):
    await seed_analytics_data(clean_database)
    response = await admin_client.get(
        "/analytics/hotels", params={"date_from": PERIOD_START, "date_to": PERIOD_END}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert [item["hotel_id"] for item in body["items"]] == sorted(item["hotel_id"] for item in body["items"])

    report = body["items"][0]
    assert report == {
        "hotel_id": clean_database["hotel_id"],
        "hotel_title": "Test Hotel",
        "hotel_location": "Moscow",
        "confirmed_bookings": 3,
        "cancelled_bookings": 1,
        "booked_revenue": 900,
        "booked_nights": 5,
        "average_rating": 4.0,
        "cancellation_rate": 25.0,
    }
    for empty in body["items"][1:]:
        assert empty["confirmed_bookings"] == 0
        assert empty["cancelled_bookings"] == 0
        assert empty["booked_revenue"] == 0
        assert empty["booked_nights"] == 0
        assert empty["average_rating"] is None
        assert empty["cancellation_rate"] == 0.0


@pytest.mark.asyncio
async def test_hotel_analytics_all_time_and_checkout_based_rating(admin_client, clean_database):
    await seed_analytics_data(clean_database)
    response = await admin_client.get("/analytics/hotels")
    assert response.status_code == 200
    report = response.json()["items"][0]
    assert report["booked_nights"] == 9
    assert report["booked_revenue"] == 1700
    assert report["average_rating"] == 3.0


@pytest.mark.asyncio
async def test_hotel_analytics_pagination_sorting_and_null_ratings_last(admin_client, clean_database):
    second_id, third_id = await seed_analytics_data(clean_database)
    page = await admin_client.get(
        "/analytics/hotels", params={"page": 2, "per_page": 1, "sort_order": "desc"}
    )
    assert page.status_code == 200
    assert page.json()["total"] == 3
    assert page.json()["items"][0]["hotel_id"] == second_id

    for direction, expected_empty_ids in (("asc", [second_id, third_id]), ("desc", [third_id, second_id])):
        response = await admin_client.get(
            "/analytics/hotels", params={"sort_by": "average_rating", "sort_order": direction}
        )
        ids = [item["hotel_id"] for item in response.json()["items"]]
        assert ids[0] == clean_database["hotel_id"]
        assert ids[1:] == expected_empty_ids

    allowed = (
        "hotel_id",
        "hotel_title",
        "confirmed_bookings",
        "cancelled_bookings",
        "booked_revenue",
        "booked_nights",
        "average_rating",
        "cancellation_rate",
    )
    for sort_by in allowed:
        assert (await admin_client.get("/analytics/hotels", params={"sort_by": sort_by})).status_code == 200


@pytest.mark.asyncio
async def test_hotel_analytics_validates_period_and_sorting(admin_client, clean_database):
    invalid_params = (
        {"date_from": PERIOD_START},
        {"date_to": PERIOD_END},
        {"date_from": PERIOD_END, "date_to": PERIOD_START},
        {"date_from": PERIOD_START, "date_to": PERIOD_START},
        {"sort_by": "revenue"},
        {"sort_order": "up"},
    )
    for params in invalid_params:
        response = await admin_client.get("/analytics/hotels", params=params)
        assert response.status_code == 422
        assert response.json()["code"] == "validation_error"

    future = await admin_client.get(
        "/analytics/hotels", params={"date_from": "2099-01-01", "date_to": "2099-02-01"}
    )
    assert future.status_code == 200
