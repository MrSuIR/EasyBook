from datetime import date

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from src.api.dependencies import get_admin_user, get_db
from src.main import app
from src.schemas.analytics import AnalyticsPeriod, HotelAnalytics


class FakeAnalyticsRepository:
    async def get_hotels_report(self, **_):
        return [
            HotelAnalytics(
                hotel_id=1,
                hotel_title="Test Hotel",
                hotel_location="Moscow",
                confirmed_bookings=2,
                cancelled_bookings=1,
                booked_revenue=5000,
                booked_nights=2,
                average_rating=4.5,
                cancellation_rate=33.33,
            )
        ], 1


class FakeDB:
    analytics = FakeAnalyticsRepository()


@pytest.mark.parametrize(
    "values",
    [
        {"date_from": date(2026, 1, 1)},
        {"date_to": date(2026, 2, 1)},
        {"date_from": date(2026, 2, 1), "date_to": date(2026, 1, 1)},
        {"date_from": date(2026, 1, 1), "date_to": date(2026, 1, 1)},
    ],
)
def test_analytics_period_rejects_incomplete_or_invalid_range(values):
    with pytest.raises(ValidationError):
        AnalyticsPeriod(**values)


def test_analytics_period_accepts_all_time_and_future_range():
    assert AnalyticsPeriod().date_from is None
    future = AnalyticsPeriod(date_from=date(2099, 1, 1), date_to=date(2099, 2, 1))
    assert future.date_to == date(2099, 2, 1)


def test_analytics_period_api_uses_validation_error_contract():
    app.dependency_overrides[get_db] = lambda: None
    app.dependency_overrides[get_admin_user] = lambda: object()
    try:
        response = TestClient(app).get(
            "/analytics/hotels", params={"date_from": "2026-01-01"}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_analytics_api_combines_period_pagination_sorting_and_response():
    app.dependency_overrides[get_db] = lambda: FakeDB()
    app.dependency_overrides[get_admin_user] = lambda: object()
    try:
        response = TestClient(app).get(
            "/analytics/hotels",
            params={
                "date_from": "2099-01-01",
                "date_to": "2099-02-01",
                "page": 2,
                "per_page": 5,
                "sort_by": "booked_revenue",
                "sort_order": "desc",
            },
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "hotel_id": 1,
                "hotel_title": "Test Hotel",
                "hotel_location": "Moscow",
                "confirmed_bookings": 2,
                "cancelled_bookings": 1,
                "booked_revenue": 5000,
                "booked_nights": 2,
                "average_rating": 4.5,
                "cancellation_rate": 33.33,
            }
        ],
        "total": 1,
        "page": 2,
        "per_page": 5,
    }
