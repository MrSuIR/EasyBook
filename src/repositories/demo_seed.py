from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import TYPE_CHECKING
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import delete, func, insert, or_, select, tuple_

from src.constants import BookingStatus
from src.models import BookingsOrm, HotelImagesOrm, HotelsOrm, ReviewsOrm, RoomsOrm
from src.models.facilities import RoomsFacilitiesOrm
from src.service.demo_catalog import demo_hotel_gallery

if TYPE_CHECKING:
    from src.service.demo_catalog import DemoHotelSource


ROOM_SPECS = (
    (
        "Standard",
        "Светлый и продуманный номер для короткой поездки, деловой остановки "
        "или спокойного отдыха в городе. В нём есть удобная кровать, рабочее "
        "место, быстрый Wi-Fi и климат-контроль, а утренний завтрак помогает "
        "начать день без лишних забот.",
        0,
        ("Wi-Fi", "Breakfast", "Air conditioning"),
    ),
    (
        "Comfort",
        "Просторный номер для отдыха вдвоём или небольшой семьи, где легко "
        "сочетать расслабленный ритм и личные планы. Дополнительное место для "
        "хранения, удобная зона отдыха, доступ к ресторану и фитнес-центру "
        "делают проживание особенно комфортным.",
        3_200,
        ("Wi-Fi", "Breakfast", "Parking", "Restaurant", "Fitness center"),
    ),
    (
        "Suite",
        "Большой номер с отдельной гостиной для тех, кому важны пространство, "
        "приватность и внимательный сервис. Здесь удобно принимать гостей, "
        "отдыхать после насыщенного дня и пользоваться расширенным набором "
        "услуг: спа, обслуживанием в номере и трансфером из аэропорта.",
        7_600,
        ("Wi-Fi", "Breakfast", "Spa", "Room service", "Airport transfer"),
    ),
)

REVIEW_COMMENTS = (
    "Прекрасное расположение, вежливый персонал и очень чистый номер.",
    "Отель полностью оправдал ожидания: удобная кровать и отличный завтрак.",
    "Красивый интерьер, спокойная атмосфера и внимательное обслуживание.",
    "Хороший вариант для поездки: быстрое заселение и комфортный номер.",
    "С удовольствием остановимся здесь снова во время следующего путешествия.",
)


def _batches(values: list[dict], size: int = 1_500):
    for start in range(0, len(values), size):
        yield values[start : start + size]


@dataclass(frozen=True)
class DemoSeedDatabaseResult:
    hotels: int
    rooms: int
    bookings: int
    reviews: int
    images: int


class DemoSeedRepository:
    def __init__(self, session) -> None:
        self.session = session

    async def replace_catalog(
        self,
        catalog: tuple[DemoHotelSource, ...],
        legacy_titles: tuple[str, ...],
        users: dict[str, int],
        facilities: dict[str, int],
        today: date,
    ) -> DemoSeedDatabaseResult:
        pairs = [(item.title, item.location) for item in catalog]
        condition = or_(
            tuple_(HotelsOrm.title, HotelsOrm.location).in_(pairs),
            HotelsOrm.title.in_(legacy_titles),
            HotelsOrm.title.like("EasyBook %"),
        )
        hotel_ids = list((await self.session.execute(select(HotelsOrm.id).where(condition))).scalars())
        statuses_by_key = {
            (row.title, row.location): row.status
            for row in (
                await self.session.execute(
                    select(HotelsOrm.title, HotelsOrm.location, HotelsOrm.status).where(condition)
                )
            ).all()
        }
        if hotel_ids:
            room_ids = list(
                (
                    await self.session.execute(select(RoomsOrm.id).where(RoomsOrm.hotel_id.in_(hotel_ids)))
                ).scalars()
            )
            booking_ids = []
            if room_ids:
                booking_ids = list(
                    (
                        await self.session.execute(
                            select(BookingsOrm.id).where(BookingsOrm.room_id.in_(room_ids))
                        )
                    ).scalars()
                )
            if booking_ids:
                await self.session.execute(delete(ReviewsOrm).where(ReviewsOrm.booking_id.in_(booking_ids)))
                await self.session.execute(delete(BookingsOrm).where(BookingsOrm.id.in_(booking_ids)))
            if room_ids:
                await self.session.execute(
                    delete(RoomsFacilitiesOrm).where(RoomsFacilitiesOrm.room_id.in_(room_ids))
                )
                await self.session.execute(delete(RoomsOrm).where(RoomsOrm.id.in_(room_ids)))
            await self.session.execute(delete(HotelImagesOrm).where(HotelImagesOrm.hotel_id.in_(hotel_ids)))
            await self.session.execute(delete(HotelsOrm).where(HotelsOrm.id.in_(hotel_ids)))

        await self._reset_catalog_identity_sequences()

        hotel_rows = (
            await self.session.execute(
                insert(HotelsOrm)
                .values(
                    [
                        {
                            "title": item.title,
                            "location": item.location,
                            "status": statuses_by_key.get((item.title, item.location), "active"),
                        }
                        for item in catalog
                    ]
                )
                .returning(HotelsOrm.id, HotelsOrm.title, HotelsOrm.location)
            )
        ).all()
        hotel_ids_by_key = {(row.title, row.location): row.id for row in hotel_rows}

        room_values = []
        for index, hotel in enumerate(catalog):
            hotel_id = hotel_ids_by_key[(hotel.title, hotel.location)]
            base_price = 4_000 + (index % 18) * 550
            for title, description, supplement, _ in ROOM_SPECS:
                room_values.append(
                    {
                        "hotel_id": hotel_id,
                        "title": title,
                        "description": description,
                        "price": base_price + supplement,
                        "quantity": 4 + (index + supplement) % 7,
                    }
                )
        room_rows = []
        for batch in _batches(room_values):
            room_rows.extend(
                (
                    await self.session.execute(
                        insert(RoomsOrm)
                        .values(batch)
                        .returning(RoomsOrm.id, RoomsOrm.hotel_id, RoomsOrm.title, RoomsOrm.price)
                    )
                ).all()
            )
        rooms_by_key = {(row.hotel_id, row.title): row for row in room_rows}

        facility_values = []
        for room in room_rows:
            facility_titles = next(spec[3] for spec in ROOM_SPECS if spec[0] == room.title)
            facility_values.extend(
                {"room_id": room.id, "facility_id": facilities[title]} for title in facility_titles
            )
        for batch in _batches(facility_values, size=5_000):
            await self.session.execute(insert(RoomsFacilitiesOrm).values(batch))

        now = datetime.now(timezone.utc)
        booking_values = []
        for index, hotel in enumerate(catalog):
            hotel_id = hotel_ids_by_key[(hotel.title, hotel.location)]
            room = rooms_by_key[(hotel_id, "Standard")]
            user_id = users["client@example.com" if index % 2 == 0 else "traveler@example.com"]
            completed_from = today - timedelta(days=20 + index % 150)
            booking_values.extend(
                (
                    {
                        "room_id": room.id,
                        "user_id": user_id,
                        "date_from": completed_from,
                        "date_to": completed_from + timedelta(days=2 + index % 5),
                        "price": room.price,
                        "status": BookingStatus.CONFIRMED.value,
                        "cancelled_at": None,
                    },
                    {
                        "room_id": room.id,
                        "user_id": user_id,
                        "date_from": today + timedelta(days=10 + index % 120),
                        "date_to": today + timedelta(days=13 + index % 120),
                        "price": room.price,
                        "status": BookingStatus.CONFIRMED.value,
                        "cancelled_at": None,
                    },
                    {
                        "room_id": room.id,
                        "user_id": user_id,
                        "date_from": today + timedelta(days=150 + index % 90),
                        "date_to": today + timedelta(days=153 + index % 90),
                        "price": room.price,
                        "status": BookingStatus.CANCELLED.value,
                        "cancelled_at": now,
                    },
                )
            )
        booking_rows = []
        for batch in _batches(booking_values):
            booking_rows.extend(
                (
                    await self.session.execute(
                        insert(BookingsOrm)
                        .values(batch)
                        .returning(
                            BookingsOrm.id, BookingsOrm.room_id, BookingsOrm.date_from, BookingsOrm.status
                        )
                    )
                ).all()
            )
        completed_by_room = {
            row.room_id: row
            for row in booking_rows
            if row.status == BookingStatus.CONFIRMED.value and row.date_from < today
        }
        review_values = []
        for index, hotel in enumerate(catalog):
            hotel_id = hotel_ids_by_key[(hotel.title, hotel.location)]
            room = rooms_by_key[(hotel_id, "Standard")]
            booking = completed_by_room[room.id]
            review_values.append(
                {
                    "booking_id": booking.id,
                    "rating": 4 + index % 2,
                    "comment": REVIEW_COMMENTS[index % len(REVIEW_COMMENTS)],
                }
            )
        for batch in _batches(review_values):
            await self.session.execute(insert(ReviewsOrm).values(batch))

        image_values = []
        for hotel in catalog:
            hotel_id = hotel_ids_by_key[(hotel.title, hotel.location)]
            for position, photo in enumerate(demo_hotel_gallery(catalog, hotel)):
                image_id: UUID = uuid5(
                    NAMESPACE_URL, f"easybook-demo:{hotel.location}:{hotel.title}:{position}"
                )
                image_values.append(
                    {"id": image_id, "hotel_id": hotel_id, "original_path": photo.image_path}
                )
        for batch in _batches(image_values):
            await self.session.execute(insert(HotelImagesOrm).values(batch))
        return DemoSeedDatabaseResult(
            hotels=len(hotel_rows),
            rooms=len(room_rows),
            bookings=len(booking_rows),
            reviews=len(review_values),
            images=len(image_values),
        )

    async def _reset_catalog_identity_sequences(self) -> None:
        """Reuse freed demo IDs without colliding with retained user data."""
        for model in (HotelsOrm, RoomsOrm, BookingsOrm, ReviewsOrm):
            has_rows = func.count(model.id) > 0
            statement = select(
                func.setval(
                    func.pg_get_serial_sequence(model.__tablename__, "id"),
                    func.coalesce(func.max(model.id), 1),
                    has_rows,
                )
            ).select_from(model)
            await self.session.execute(statement)
