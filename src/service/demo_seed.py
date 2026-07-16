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
DEMO_FACILITIES = (
    "Wi-Fi",
    "Breakfast",
    "Parking",
    "Pool",
    "Spa",
    "Air conditioning",
    "Restaurant",
    "Fitness center",
    "Airport transfer",
    "Pet friendly",
    "Room service",
    "Family rooms",
)
DEMO_CITIES = (
    "Москва",
    "Санкт-Петербург",
    "Казань",
    "Сочи",
    "Калининград",
    "Нижний Новгород",
    "Ярославль",
    "Владивосток",
    "Екатеринбург",
    "Новосибирск",
    "Самара",
    "Тула",
    "Псков",
    "Великий Новгород",
    "Иркутск",
    "Краснодар",
    "Ростов-на-Дону",
    "Пермь",
    "Уфа",
    "Мурманск",
)
DEMO_REVIEW_COMMENTS = (
    "Отличное расположение, чистый номер и внимательный персонал",
    "Удобная кровать, хороший завтрак и спокойная атмосфера",
    "Всё прошло отлично, обязательно вернёмся в следующую поездку",
    "Красивый интерьер и быстрый сервис без лишней суеты",
    "Хороший вариант для выходных: тихо, уютно и близко к центру",
)


def _build_demo_hotels():
    legacy_hotels = (
        (
            "Metropol Demo",
            "Москва",
            (
                ("Standard", "A practical room for two guests", 4500, 4, ("Wi-Fi", "Breakfast")),
                ("Business", "A quiet room with a work area", 6800, 2, ("Wi-Fi", "Breakfast", "Parking")),
                (
                    "Suite",
                    "A spacious suite for a longer city stay",
                    9800,
                    2,
                    ("Wi-Fi", "Breakfast", "Spa", "Room service"),
                ),
            ),
        ),
        (
            "Nevsky Demo",
            "Санкт-Петербург",
            (
                ("Comfort", "A room overlooking the city", 5200, 3, ("Wi-Fi", "Air conditioning")),
                ("Suite", "A spacious suite with a lounge", 9500, 1, ("Wi-Fi", "Breakfast", "Spa")),
                (
                    "Standard",
                    "A bright room near the historic center",
                    6100,
                    4,
                    ("Wi-Fi", "Breakfast", "Restaurant"),
                ),
            ),
        ),
        (
            "Volga Demo",
            "Казань",
            (
                ("Economy", "A compact room for a short stay", 3000, 5, ("Wi-Fi", "Parking")),
                ("Family", "A family room for up to four guests", 7400, 2, ("Wi-Fi", "Pool", "Parking")),
                (
                    "Suite",
                    "A suite with a separate lounge area",
                    8700,
                    2,
                    ("Wi-Fi", "Breakfast", "Family rooms"),
                ),
            ),
        ),
    )
    generated_hotels = []
    room_titles = ("Standard", "Comfort", "Suite")
    descriptions = (
        "Светлый номер для короткой поездки или деловой остановки",
        "Просторный номер с рабочей зоной и местом для отдыха",
        "Большой номер с гостиной и расширенным набором удобств",
    )
    facility_sets = (
        ("Wi-Fi", "Breakfast", "Air conditioning"),
        ("Wi-Fi", "Parking", "Restaurant", "Fitness center"),
        ("Wi-Fi", "Breakfast", "Spa", "Room service", "Airport transfer"),
    )
    for hotel_number in range(4, 101):
        city = DEMO_CITIES[(hotel_number - 4) % len(DEMO_CITIES)]
        base_price = 3200 + (hotel_number % 12) * 430
        room_specs = tuple(
            (
                room_title,
                descriptions[room_index],
                base_price + room_index * 2600,
                2 + (hotel_number + room_index) % 7,
                facility_sets[room_index],
            )
            for room_index, room_title in enumerate(room_titles)
        )
        generated_hotels.append((f"EasyBook {city} {hotel_number:03d}", city, room_specs))
    return legacy_hotels + tuple(generated_hotels)


DEMO_HOTELS = _build_demo_hotels()


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
        seed_today = today or date.today()
        bookings = await self._ensure_bookings(users, rooms, seed_today)
        review_count = await self._ensure_reviews(bookings, seed_today)
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
                existing = await self.db.users.edit(
                    UserAdd(
                        email=email,
                        hashed_password=(
                            existing.hashed_password
                            if password_matches
                            else auth.hashed_password(DEMO_PASSWORD)
                        ),
                        role=role,
                    ),
                    id=existing.id,
                )
            users[email] = existing
        return users

    async def _ensure_facilities(self) -> dict[str, Facility]:
        facilities = {}
        for title in DEMO_FACILITIES:
            matches = await self.db.facilities.get_filtered(title=title)
            facilities[title] = (
                min(matches, key=lambda item: item.id)
                if matches
                else await self.db.facilities.add(FacilityAdd(title=title))
            )
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
        legacy_specs = (
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
        legacy_room_keys = {
            ("Metropol Demo", "Standard"),
            ("Metropol Demo", "Business"),
            ("Nevsky Demo", "Comfort"),
            ("Volga Demo", "Family"),
        }
        generated_specs = []
        generated_index = 0
        for room_key, room in rooms.items():
            if room_key in legacy_room_keys:
                continue
            pattern = generated_index % 5
            user_email = "client@example.com" if generated_index % 2 == 0 else "traveler@example.com"
            if pattern in (0, 4):
                date_from = today - timedelta(days=10 + generated_index % 45)
                date_to = date_from + timedelta(days=2 + generated_index % 4)
                should_cancel = False
            else:
                date_from = today + timedelta(days=1 + generated_index % 60)
                date_to = date_from + timedelta(days=2 + generated_index % 5)
                should_cancel = pattern == 3
            generated_specs.append(
                (
                    f"catalog-{generated_index:03d}",
                    users[user_email].id,
                    room,
                    date_from,
                    date_to,
                    should_cancel,
                )
            )
            generated_index += 1

        specs = legacy_specs + tuple(generated_specs)
        bookings = {}
        for name, user_id, room, date_from, date_to, should_cancel in specs:
            matches = await self.db.bookings.get_filtered(user_id=user_id, room_id=room.id)
            existing = min(matches, key=lambda item: item.id) if matches else None
            cancelled_at = None
            if should_cancel:
                cancelled_at = (
                    existing.cancelled_at
                    if existing is not None and existing.cancelled_at is not None
                    else datetime.now(timezone.utc)
                )
            booking_data = BookingSeed(
                user_id=user_id,
                room_id=room.id,
                date_from=date_from,
                date_to=date_to,
                price=room.price,
                status=(BookingStatus.CANCELLED if should_cancel else BookingStatus.CONFIRMED),
                cancelled_at=cancelled_at,
            )
            if existing is not None:
                booking = await self.db.bookings.edit(booking_data, id=existing.id)
            else:
                booking = await self.db.bookings.add(booking_data)
            bookings[name] = booking
        return bookings

    async def _ensure_reviews(self, bookings: dict[str, Booking], today: date) -> int:
        count = 0
        for index, (name, booking) in enumerate(bookings.items()):
            if booking.status != BookingStatus.CONFIRMED or booking.date_to > today:
                continue
            rating = 5 if name == "completed" else 3 + index % 3
            comment = (
                "Excellent location and friendly staff"
                if name == "completed"
                else DEMO_REVIEW_COMMENTS[index % len(DEMO_REVIEW_COMMENTS)]
            )
            matches = await self.db.reviews.get_filtered(booking_id=booking.id)
            if not matches:
                await self.db.reviews.add(ReviewAdd(booking_id=booking.id, rating=rating, comment=comment))
                count += 1
                continue
            review = min(matches, key=lambda item: item.id)
            if review.rating != rating or review.comment != comment:
                await self.db.reviews.edit_review(review.id, ReviewPatch(rating=rating, comment=comment))
            count += 1
        return count
