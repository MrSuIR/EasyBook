from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from src.config import settings
from src.constants import BookingStatus, UserRole
from src.schemas.bookings import Booking, BookingSeed
from src.schemas.facilities import Facility, FacilityAdd
from src.schemas.hotels import Hotel, HotelAdd
from src.schemas.reviews import ReviewAdd, ReviewPatch
from src.schemas.rooms import Room, RoomAdd
from src.schemas.users import UserAdd
from src.service.auth import AuthService
from src.service.base import BaseService


DEMO_PASSWORD = "12345678"
DEMO_USERS = (
    ("admin@example.com", UserRole.ADMIN),
    ("client@example.com", UserRole.CLIENT),
    ("traveler@example.com", UserRole.CLIENT),
)
DEMO_FACILITIES = ("Wi-Fi", "Breakfast", "Parking", "Pool", "Spa", "Air conditioning")
DEMO_HOTELS = (
    (
        "Metropol Demo",
        "Moscow",
        (
            ("Standard", "A practical room for two guests", 4500, 4, ("Wi-Fi", "Breakfast")),
            ("Business", "A quiet room with a work area", 6800, 2, ("Wi-Fi", "Breakfast", "Parking")),
        ),
    ),
    (
        "Nevsky Demo",
        "Saint Petersburg",
        (
            ("Comfort", "A room overlooking the city", 5200, 3, ("Wi-Fi", "Air conditioning")),
            ("Suite", "A spacious suite with a lounge", 9500, 1, ("Wi-Fi", "Breakfast", "Spa")),
        ),
    ),
    (
        "Volga Demo",
        "Kazan",
        (
            ("Economy", "A compact room for a short stay", 3000, 5, ("Wi-Fi", "Parking")),
            ("Family", "A family room for up to four guests", 7400, 2, ("Wi-Fi", "Pool", "Parking")),
        ),
    ),
)


class DemoSeedNotAllowedError(RuntimeError):
    pass


@dataclass(frozen=True)
class DemoSeedSummary:
    users: int
    facilities: int
    hotels: int
    rooms: int
    bookings: int
    reviews: int


class DemoSeedService(BaseService):
    async def seed(self, today: date | None = None) -> DemoSeedSummary:
        if settings.MODE == "PROD":
            raise DemoSeedNotAllowedError("Demo data cannot be created when MODE=PROD")

        users = await self._ensure_users()
        facilities = await self._ensure_facilities()
        hotels, rooms = await self._ensure_catalog(facilities)
        bookings = await self._ensure_bookings(users, rooms, today or date.today())
        review_count = await self._ensure_review(bookings["completed"])
        await self.db.commit()
        return DemoSeedSummary(
            users=len(users),
            facilities=len(facilities),
            hotels=len(hotels),
            rooms=len(rooms),
            bookings=len(bookings),
            reviews=review_count,
        )

    async def _ensure_users(self):
        users = {}
        auth = AuthService()
        for email, role in DEMO_USERS:
            existing = await self.db.users.get_user_with_hashed_password(email=email)
            if existing is None:
                users[email] = await self.db.users.add(
                    UserAdd(email=email, hashed_password=auth.hashed_password(DEMO_PASSWORD), role=role)
                )
                continue

            password_matches = auth.verify_password(DEMO_PASSWORD, existing.hashed_password)
            if existing.role != role or not password_matches:
                password_hash = existing.hashed_password
                if not password_matches:
                    password_hash = auth.hashed_password(DEMO_PASSWORD)

                existing = await self.db.users.edit(
                    UserAdd(email=email, hashed_password=password_hash, role=role), id=existing.id
                )
            users[email] = existing
        return users

    async def _ensure_facilities(self) -> dict[str, Facility]:
        facilities = {}
        for title in DEMO_FACILITIES:
            matches = await self.db.facilities.get_filtered(title=title)
            if matches:
                facility = min(matches, key=lambda item: item.id)
            else:
                facility = await self.db.facilities.add(FacilityAdd(title=title))
            facilities[title] = facility
        return facilities

    async def _ensure_catalog(
        self, facilities: dict[str, Facility]
    ) -> tuple[dict[str, Hotel], dict[tuple[str, str], Room]]:
        hotels = {}
        rooms = {}
        for title, location, room_specs in DEMO_HOTELS:
            hotel_matches = await self.db.hotels.get_filtered(title=title)
            hotel_data = HotelAdd(title=title, location=location)
            if hotel_matches:
                hotel = min(hotel_matches, key=lambda item: item.id)
                hotel = await self.db.hotels.edit(hotel_data, id=hotel.id)
            else:
                hotel = await self.db.hotels.add(hotel_data)
            hotels[title] = hotel

            for room_title, description, price, quantity, facility_titles in room_specs:
                room_matches = await self.db.rooms.get_filtered(hotel_id=hotel.id, title=room_title)
                room_data = RoomAdd(
                    hotel_id=hotel.id,
                    title=room_title,
                    description=description,
                    price=price,
                    quantity=quantity,
                )
                if room_matches:
                    room = min(room_matches, key=lambda item: item.id)
                    room = await self.db.rooms.edit(room_data, id=room.id)
                else:
                    room = await self.db.rooms.add(room_data)
                await self.db.rooms_facilities.set_room_facilities(
                    [facilities[name].id for name in facility_titles], room.id
                )
                rooms[(title, room_title)] = room
        return hotels, rooms

    async def _ensure_bookings(self, users, rooms, today: date) -> dict[str, Booking]:
        specs = (
            (
                "completed",
                users["client@example.com"].id,
                rooms[("Metropol Demo", "Standard")],
                today - timedelta(days=30),
                today - timedelta(days=27),
                False,
            ),
            (
                "upcoming",
                users["client@example.com"].id,
                rooms[("Metropol Demo", "Business")],
                today + timedelta(days=2),
                today + timedelta(days=5),
                False,
            ),
            (
                "traveler",
                users["traveler@example.com"].id,
                rooms[("Nevsky Demo", "Comfort")],
                today + timedelta(days=7),
                today + timedelta(days=10),
                False,
            ),
            (
                "cancelled",
                users["traveler@example.com"].id,
                rooms[("Volga Demo", "Family")],
                today + timedelta(days=14),
                today + timedelta(days=17),
                True,
            ),
        )
        bookings = {}
        for name, user_id, room, date_from, date_to, should_cancel in specs:
            matches = await self.db.bookings.get_filtered(user_id=user_id, room_id=room.id)
            existing = None
            if matches:
                existing = min(matches, key=lambda item: item.id)

            cancelled_at = None
            if should_cancel:
                existing_cancellation_date = None
                if existing is not None:
                    existing_cancellation_date = existing.cancelled_at
                cancelled_at = existing_cancellation_date or datetime.now(timezone.utc)

            status = BookingStatus.CONFIRMED
            if should_cancel:
                status = BookingStatus.CANCELLED

            booking_data = BookingSeed(
                user_id=user_id,
                room_id=room.id,
                date_from=date_from,
                date_to=date_to,
                price=room.price,
                status=status,
                cancelled_at=cancelled_at,
            )
            if existing is not None:
                booking = await self.db.bookings.edit(booking_data, id=existing.id)
            else:
                booking = await self.db.bookings.add(booking_data)
            bookings[name] = booking
        return bookings

    async def _ensure_review(self, booking: Booking) -> int:
        matches = await self.db.reviews.get_filtered(booking_id=booking.id)
        if not matches:
            await self.db.reviews.add(
                ReviewAdd(booking_id=booking.id, rating=5, comment="Excellent location and friendly staff")
            )
            return 1
        review = min(matches, key=lambda item: item.id)
        if review.rating != 5 or review.comment != "Excellent location and friendly staff":
            await self.db.reviews.edit_review(
                review.id, ReviewPatch(rating=5, comment="Excellent location and friendly staff")
            )
        return 1
