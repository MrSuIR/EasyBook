import asyncio
from datetime import date, timedelta

import pytest

from src.constants import BookingStatus
from src.database import async_session_maker_null_pool
from src.schemas.bookings import BookingAdd
from src.utils.db_manager import DBManager


async def create_booking(
    room_id: int,
    email: str = "client@example.com",
    date_to: date | None = None,
    status: BookingStatus = BookingStatus.CONFIRMED,
):
    checkout = date_to or date.today()
    async with DBManager(session_factory=async_session_maker_null_pool) as db:
        user = await db.users.get_user_with_hashed_password(email=email)
        assert user is not None
        booking = await db.bookings.add(
            BookingAdd(
                room_id=room_id,
                user_id=user.id,
                date_from=checkout - timedelta(days=2),
                date_to=checkout,
                price=2500,
                status=status,
            )
        )
        await db.commit()
        return booking


def review_payload(booking_id: int, rating: int = 5, comment: str = "Отлично"):
    return {"booking_id": booking_id, "rating": rating, "comment": comment}


@pytest.mark.asyncio
async def test_review_requires_owner_completed_confirmed_booking(
    anonymous_client, client, other_client, clean_database
):
    completed = await create_booking(clean_database["room_id"])
    assert (
        await anonymous_client.post("/reviews", json=review_payload(completed.id))
    ).status_code == 401
    assert (
        await other_client.post("/reviews", json=review_payload(completed.id))
    ).status_code == 403

    future = await create_booking(
        clean_database["room_id"], date_to=date.today() + timedelta(days=1)
    )
    too_early = await client.post("/reviews", json=review_payload(future.id))
    assert too_early.status_code == 409
    assert too_early.json()["code"] == "review_not_allowed"

    cancelled = await create_booking(
        clean_database["room_id"], status=BookingStatus.CANCELLED
    )
    not_confirmed = await client.post(
        "/reviews", json=review_payload(cancelled.id)
    )
    assert not_confirmed.status_code == 409
    assert not_confirmed.json()["code"] == "review_not_allowed"

    created = await client.post(
        "/reviews", json=review_payload(completed.id, comment="  Отлично  ")
    )
    assert created.status_code == 201
    assert created.json()["comment"] == "Отлично"
    assert created.json()["booking_id"] == completed.id


@pytest.mark.asyncio
async def test_parallel_duplicate_review_only_one_succeeds(client, clean_database):
    booking = await create_booking(clean_database["room_id"])
    responses = await asyncio.gather(
        *(client.post("/reviews", json=review_payload(booking.id)) for _ in range(5))
    )
    assert [response.status_code for response in responses].count(201) == 1
    assert [response.status_code for response in responses].count(409) == 4
    assert {
        response.json()["code"]
        for response in responses
        if response.status_code == 409
    } == {"review_already_exists"}


@pytest.mark.asyncio
async def test_owner_can_patch_delete_and_recreate_review(
    client, other_client, admin_client, clean_database
):
    booking = await create_booking(clean_database["room_id"])
    created = await client.post("/reviews", json=review_payload(booking.id))
    review = created.json()
    review_id = review["id"]

    assert (await other_client.get(f"/reviews/{review_id}")).status_code == 403
    assert (
        await admin_client.patch(f"/reviews/{review_id}", json={"rating": 1})
    ).status_code == 403
    patched = await client.patch(
        f"/reviews/{review_id}", json={"rating": 4, "comment": "  Хорошо "}
    )
    assert patched.status_code == 200
    assert patched.json()["rating"] == 4
    assert patched.json()["comment"] == "Хорошо"
    assert patched.json()["updated_at"] > review["updated_at"]

    deleted = await client.delete(f"/reviews/{review_id}")
    assert deleted.status_code == 200
    assert deleted.json() == {"status": "OK"}
    assert (await client.get(f"/reviews/{review_id}")).status_code == 404
    assert (
        await client.post("/reviews", json=review_payload(booking.id, rating=3))
    ).status_code == 201


@pytest.mark.asyncio
async def test_review_payload_validation(client, clean_database):
    booking = await create_booking(clean_database["room_id"])
    invalid_create_payloads = (
        review_payload(booking.id, rating=0),
        review_payload(booking.id, rating=6),
        review_payload(booking.id, rating=True),
        review_payload(booking.id, comment="   "),
        review_payload(booking.id, comment="x" * 2001),
    )
    for payload in invalid_create_payloads:
        assert (await client.post("/reviews", json=payload)).status_code == 422

    created = await client.post("/reviews", json=review_payload(booking.id))
    review_id = created.json()["id"]
    for payload in ({}, {"rating": None}, {"comment": None}, {"booking_id": booking.id}):
        assert (
            await client.patch(f"/reviews/{review_id}", json=payload)
        ).status_code == 422


@pytest.mark.asyncio
async def test_public_hotel_reviews_and_private_my_list(
    anonymous_client, client, other_client, clean_database
):
    first_booking = await create_booking(clean_database["room_id"])
    second_booking = await create_booking(
        clean_database["room_id"], email="other@example.com"
    )
    first = await client.post(
        "/reviews", json=review_payload(first_booking.id, comment="Первый")
    )
    second = await other_client.post(
        "/reviews", json=review_payload(second_booking.id, comment="Второй")
    )

    public = await anonymous_client.get(
        f"/hotels/{clean_database['hotel_id']}/reviews?page=1&per_page=1"
    )
    assert public.status_code == 200
    body = public.json()
    assert body["total"] == 2
    assert body["items"][0]["id"] == second.json()["id"]
    assert set(body["items"][0]) == {
        "id",
        "rating",
        "comment",
        "created_at",
        "updated_at",
    }
    mine = await client.get("/reviews/me")
    assert [item["id"] for item in mine.json()] == [first.json()["id"]]
    assert (await anonymous_client.get("/hotels/999999/reviews")).status_code == 404


@pytest.mark.asyncio
async def test_booking_with_review_cannot_be_cancelled(client, clean_database):
    booking = await create_booking(clean_database["room_id"])
    review = await client.post("/reviews", json=review_payload(booking.id))
    assert review.status_code == 201
    cancelled = await client.post(f"/bookings/{booking.id}/cancel")
    assert cancelled.status_code == 409
    assert cancelled.json()["code"] == "booking_has_review"
    assert (await client.get(f"/reviews/{review.json()['id']}")).status_code == 200


@pytest.mark.asyncio
async def test_concurrent_review_and_cancellation_preserve_invariant(
    client, clean_database
):
    booking = await create_booking(clean_database["room_id"])
    review_response, cancel_response = await asyncio.gather(
        client.post("/reviews", json=review_payload(booking.id)),
        client.post(f"/bookings/{booking.id}/cancel"),
    )
    assert (review_response.status_code, cancel_response.status_code) == (201, 409)
    assert cancel_response.json()["code"] in {
        "booking_has_review",
        "booking_cancellation_closed",
    }


@pytest.mark.asyncio
async def test_public_review_sorting_defaults_partial_params_and_tie_breaker(
    anonymous_client, client, clean_database
):
    reviews = []
    for rating in (3, 5, 3):
        booking = await create_booking(clean_database["room_id"])
        response = await client.post(
            "/reviews", json=review_payload(booking.id, rating=rating)
        )
        assert response.status_code == 201
        reviews.append(response.json())

    url = f"/hotels/{clean_database['hotel_id']}/reviews"
    default = await anonymous_client.get(url)
    assert [item["id"] for item in default.json()["items"]] == [
        item["id"] for item in reversed(reviews)
    ]

    oldest_first = await anonymous_client.get(f"{url}?sort_order=asc")
    assert [item["id"] for item in oldest_first.json()["items"]] == [
        item["id"] for item in reviews
    ]

    by_rating = await anonymous_client.get(f"{url}?sort_by=rating")
    assert [item["id"] for item in by_rating.json()["items"]] == [
        reviews[1]["id"],
        reviews[2]["id"],
        reviews[0]["id"],
    ]


@pytest.mark.asyncio
async def test_review_sorting_rejects_unknown_values(
    anonymous_client, clean_database
):
    url = f"/hotels/{clean_database['hotel_id']}/reviews"
    for query in ("sort_by=updated_at", "sort_order=newest"):
        assert (await anonymous_client.get(f"{url}?{query}")).status_code == 422
    for sort_by in ("created_at", "rating"):
        assert (
            await anonymous_client.get(url, params={"sort_by": sort_by})
        ).status_code == 200
