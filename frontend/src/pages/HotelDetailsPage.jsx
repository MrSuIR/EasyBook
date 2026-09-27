import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Coffee,
  ConciergeBell,
  Dumbbell,
  LoaderCircle,
  MapPin,
  PawPrint,
  Plane,
  Snowflake,
  Sparkles,
  Star,
  UsersRound,
  Utensils,
  Waves,
  Wifi,
} from "lucide-react";

import { api } from "../api.js";
import { localDateKey } from "../dateUtils.js";
import { formatPrice, normalizeImageUrl } from "../utils/formatters.js";

const hotelFallback = "/images/hotel-fallback.jpg";

function nightsBetween(dateFrom, dateTo) {
  return Math.max(
    0,
    Math.round(
      (new Date(`${dateTo}T00:00:00`) - new Date(`${dateFrom}T00:00:00`)) /
        86400000,
    ),
  );
}

const facilityIcons = {
  "wi-fi": Wifi,
  breakfast: Coffee,
  parking: CarFront,
  pool: Waves,
  spa: Sparkles,
  "air conditioning": Snowflake,
  restaurant: Utensils,
  "fitness center": Dumbbell,
  "airport transfer": Plane,
  "pet friendly": PawPrint,
  "room service": ConciergeBell,
  "family rooms": UsersRound,
};

function FacilityIcon({ facility }) {
  const source = facility.image_url;
  const FallbackIcon = facilityIcons[facility.title.toLowerCase()] || Sparkles;
  if (!source) return <FallbackIcon aria-hidden="true" />;
  return (
    <>
      <img
        src={source}
        alt=""
        aria-hidden="true"
        onError={(event) => {
          event.currentTarget.hidden = true;
          event.currentTarget.nextElementSibling.hidden = false;
        }}
      />
      <FallbackIcon aria-hidden="true" hidden />
    </>
  );
}

function Footer({ onNavigate }) {
  return (
    <footer id="footer">
      <a
        className="brand"
        href="/"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("/");
        }}
      >
        <span>Easy</span>Book.
      </a>
      <p>Бронируем хорошее путешествие — быстро и честно.</p>
      <nav>
        <a
          href="/#catalog"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/#catalog");
          }}
        >
          Отели
        </a>
        <button type="button" onClick={() => onNavigate("/login")}>
          Личный кабинет
        </button>
      </nav>
      <small>© 2026 EasyBook. Курсовой проект по базам данных.</small>
    </footer>
  );
}

export default function HotelDetailsPage({
  hotelId,
  initialDates,
  user,
  onNavigate,
}) {
  const [dates, setDates] = useState(initialDates);
  const [activeDates, setActiveDates] = useState(initialDates);
  const [hotel, setHotel] = useState(null);
  const [images, setImages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewSort, setReviewSort] = useState("created_at:desc");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const [reviewSortBy, reviewSortOrder] = reviewSort.split(":");
    Promise.all([
      api.hotels.get(hotelId, { signal: controller.signal }),
      api.images.list(hotelId, { signal: controller.signal }),
      api.rooms.list(hotelId, activeDates, { signal: controller.signal }),
      api.reviews.list(
        hotelId,
        {
          page: 1,
          per_page: 4,
          sort_by: reviewSortBy,
          sort_order: reviewSortOrder,
        },
        { signal: controller.signal },
      ),
    ])
      .then(([hotelData, imageData, roomData, reviewData]) => {
        setHotel(hotelData);
        setImages(imageData);
        setRooms(roomData);
        setReviews(reviewData.items);
        setSelectedRoomId((current) =>
          roomData.some((room) => room.id === current)
            ? current
            : (roomData[0]?.id ?? null),
        );
      })
      .catch((exception) => {
        if (exception.name !== "AbortError")
          setError(
            exception.status === 404 ? "Отель не найден." : exception.message,
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hotelId, activeDates, reviewSort]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;
  const nights = nightsBetween(activeDates.date_from, activeDates.date_to);
  const total = selectedRoom ? selectedRoom.price * nights : 0;
  const gallery = useMemo(() => {
    const realImages = images.map(normalizeImageUrl).filter(Boolean);
    return realImages.length ? realImages.slice(0, 3) : [hotelFallback];
  }, [images]);

  const updateDates = (field, value) => {
    const nextDates = { ...dates, [field]: value };
    setDates(nextDates);
    if (!nextDates.date_from || !nextDates.date_to || nextDates.date_to <= nextDates.date_from) {
      setError("Дата выезда должна быть позже даты заезда.");
      return;
    }
    setError("");
    if (
      nextDates.date_from === activeDates.date_from &&
      nextDates.date_to === activeDates.date_to
    ) return;
    setLoading(true);
    setActiveDates(nextDates);
  };

  const openBooking = () => {
    if (!selectedRoom) return;
    const params = new URLSearchParams({
      hotel_id: String(hotelId),
      room_id: String(selectedRoom.id),
      date_from: activeDates.date_from,
      date_to: activeDates.date_to,
    });
    const destination = `/booking?${params}`;
    if (!user) {
      onNavigate(`/login?returnTo=${encodeURIComponent(destination)}`);
      return;
    }
    onNavigate(destination);
  };

  if (loading && !hotel)
    return (
      <main className="hotel-details-state">
        <LoaderCircle className="spin" />
        Загружаем отель и доступные номера…
      </main>
    );
  if (error && !hotel)
    return (
      <main className="hotel-details-state error">
        <p>{error}</p>
        <button type="button" onClick={() => onNavigate("/")}>
          Вернуться к отелям
        </button>
      </main>
    );

  return (
    <>
      <main className="hotel-details-main">
        <section className="hotel-title-row">
          <nav aria-label="Хлебные крошки">
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                onNavigate("/");
              }}
            >
              Главная
            </a>
            <span>/</span>
            <strong>Отель</strong>
          </nav>
          <div>
            <h1>{hotel.title}</h1>
            <p>
              <MapPin />
              {hotel.location}
            </p>
          </div>
        </section>

        <section
          className="hotel-gallery"
          aria-label={`Фотографии ${hotel.title}`}
        >
          {gallery.map((source, index) => (
            <img
              key={source}
              className={index === 0 ? "hotel-gallery-main" : undefined}
              src={source}
              alt={index === 0 ? `Фотография для отеля ${hotel.title}` : `Дополнительная фотография ${index + 1}`}
            />
          ))}
        </section>

        <section className="hotel-information-grid">
          <div className="hotel-about">
            <h2>О выбранном номере</h2>
            <p className="hotel-room-description">
              {selectedRoom?.description ||
                "На выбранные даты свободных номеров нет. Измените период проживания."}
            </p>
            {selectedRoom && (
              <div className="facility-grid">
                {selectedRoom.facilities.map((facility) => (
                  <div className="facility-item" key={facility.id}>
                    <span className="facility-icon">
                      <FacilityIcon facility={facility} />
                    </span>
                    <span>{facility.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="booking-card">
            <>
              <h2>Выберите номер</h2>
              {selectedRoom ? (
                <p className="booking-price">
                  <strong>{formatPrice(selectedRoom.price)}</strong>
                  <span>за ночь</span>
                </p>
              ) : (
                <p className="booking-unavailable">
                  {hotel.status === "archived"
                    ? "Отель архивирован и не принимает новые бронирования"
                    : "Нет доступных номеров"}
                </p>
              )}
              <div className="booking-dates">
                <label>
                  <span>
                    <CalendarDays />
                    Заезд
                  </span>
                  <input
                    type="date"
                    value={dates.date_from}
                    min={localDateKey()}
                    onChange={(event) => updateDates("date_from", event.target.value)}
                  />
                </label>
                <label>
                  <span>
                    <CalendarDays />
                    Выезд
                  </span>
                  <input
                    type="date"
                    value={dates.date_to}
                    min={dates.date_from}
                    onChange={(event) => updateDates("date_to", event.target.value)}
                  />
                </label>
              </div>
              {selectedRoom && (
                <div className="booking-total">
                  <span>
                    {nights}{" "}
                    {nights === 1 ? "ночь" : nights < 5 ? "ночи" : "ночей"}
                  </span>
                  <strong>{formatPrice(total)}</strong>
                </div>
              )}
              {error && (
                <p className="booking-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="booking-submit"
                type="button"
                disabled={
                  !selectedRoom ||
                  hotel.status === "archived" ||
                  loading ||
                  dates.date_from !== activeDates.date_from ||
                  dates.date_to !== activeDates.date_to
                }
                onClick={openBooking}
              >
                {user ? (
                  <>
                    Забронировать
                    <ArrowRight />
                  </>
                ) : (
                  <>
                    Войти и забронировать
                    <ArrowRight />
                  </>
                )}
              </button>
            </>
          </aside>
        </section>

        <section className="room-choice-section">
          <header>
            <p className="hotel-section-kicker">Доступно на ваши даты</p>
            <h2>Номера на выбор</h2>
          </header>
          {rooms.length ? (
            <div className="room-choice-grid">
              {rooms.map((room, index) => (
                <button
                  className={`room-choice-card${room.id === selectedRoomId ? " selected" : ""}`}
                  type="button"
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    document
                      .querySelector(".hotel-information-grid")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  <span className="room-choice-image">
                    <img src={gallery[index % gallery.length]} alt="" />
                    {room.id === selectedRoomId && <span>Выбрано</span>}
                  </span>
                  <strong>{room.title}</strong>
                  <b>
                    {formatPrice(room.price)} <span>/ ночь</span>
                  </b>
                </button>
              ))}
            </div>
          ) : (
            <div className="hotel-empty-state">
              {hotel.status === "archived"
                ? "Отель архивирован и не принимает новые бронирования."
                : "Свободных номеров на этот период нет."}
            </div>
          )}
        </section>

        <section className="hotel-reviews-section">
          <header>
            <p className="hotel-section-kicker">Отзывы гостей</p>
            <select
              aria-label="Сортировка отзывов"
              value={reviewSort}
              onChange={(event) => setReviewSort(event.target.value)}
            >
              <option value="created_at:desc">Сначала новые</option>
              <option value="rating:desc">Сначала высокие оценки</option>
              <option value="rating:asc">Сначала низкие оценки</option>
            </select>
          </header>
          {reviews.length > 0 && (
            <div className="hotel-review-grid">
              {reviews.map((review) => (
                <article key={review.id}>
                  <div>
                    <span>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={index < review.rating ? "filled" : ""}
                        />
                      ))}
                    </span>
                    <time>
                      {new Intl.DateTimeFormat("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(review.created_at))}
                    </time>
                  </div>
                  <p>{review.comment}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer onNavigate={onNavigate} />
    </>
  );
}
