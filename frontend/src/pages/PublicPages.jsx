import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLongRightIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  PhotoIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

import { api, ApiError } from "../api.js";
import {
  EmptyState,
  ErrorState,
  Link,
  LoadingState,
  Pagination,
  SearchForm,
} from "../components.jsx";
import {
  apiMessage,
  averageRating,
  buildPath,
  formatCurrency,
  formatDate,
  imageUrl,
  nightsBetween,
  paramsToObject,
  plural,
  ratingLabel,
  searchDefaults,
} from "../utils.js";

const editorialImages = [
  "/images/hotel-belvedere.png",
  "/images/hotel-saint.png",
  "/images/hotel-kraft.png",
];

function useDeferredLoad(load) {
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
}

async function loadAllReviews(hotelId) {
  const first = await api.reviews.listHotel(hotelId, { page: 1, per_page: 100, sort_by: "created_at", sort_order: "desc" });
  const reviews = [...first.items];
  const pages = Math.ceil(first.total / first.per_page);
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, index) => api.reviews.listHotel(hotelId, {
        page: index + 2,
        per_page: 100,
        sort_by: "created_at",
        sort_order: "desc",
      })),
    );
    rest.forEach((page) => reviews.push(...page.items));
  }
  return { items: reviews, total: first.total };
}

async function enrichHotel(hotel, dates) {
  const [imagesResult, roomsResult, reviewsResult] = await Promise.allSettled([
    api.images.list(hotel.id),
    api.rooms.list(hotel.id, dates),
    loadAllReviews(hotel.id),
  ]);
  const images = imagesResult.status === "fulfilled" ? imagesResult.value : [];
  const rooms = roomsResult.status === "fulfilled" ? roomsResult.value : [];
  const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value.items : [];
  return {
    ...hotel,
    images,
    rooms,
    reviews,
    reviewsTotal: reviewsResult.status === "fulfilled" ? reviewsResult.value.total : 0,
    minPrice: rooms.length ? Math.min(...rooms.map((room) => room.price)) : null,
    rating: averageRating(reviews),
  };
}

function HotelMedia({ hotel, editorialImage, large = false }) {
  const source = imageUrl(hotel.images?.[0]);
  if (source || editorialImage) {
    return (
      <div className={`hotel-media ${large ? "hotel-media-large" : ""}`}>
        <img src={source || editorialImage} alt={source ? `Отель «${hotel.title}»` : ""} loading="lazy" />
        {!source && editorialImage && <span className="editorial-label">Редакционная иллюстрация</span>}
      </div>
    );
  }
  return (
    <div className={`hotel-media hotel-media-placeholder ${large ? "hotel-media-large" : ""}`}>
      <PhotoIcon aria-hidden="true" />
      <span>Фото ещё не добавлено</span>
    </div>
  );
}

function Rating({ rating, total }) {
  if (rating == null) return <span className="rating-empty">Пока без отзывов</span>;
  return (
    <div className="rating-line">
      <span className="rating-mark"><StarIcon aria-hidden="true" /> {rating.toFixed(1)}</span>
      <span>{ratingLabel(rating)}</span>
      <small>{total} {plural(total, "отзыв", "отзыва", "отзывов")}</small>
    </div>
  );
}

function FeaturedHotelCard({ hotel, index, search, navigate }) {
  const nights = nightsBetween(search.date_from, search.date_to);
  const path = buildPath(`/hotels/${hotel.id}`, search);
  return (
    <article className="featured-hotel-card">
      <Link to={path} navigate={navigate} className="card-media-link" aria-label={`Открыть ${hotel.title}`}>
        <HotelMedia hotel={hotel} editorialImage={editorialImages[index % editorialImages.length]} />
      </Link>
      <div className="featured-card-body">
        <div className="featured-card-main">
          <h3><Link to={path} navigate={navigate}>{hotel.title}</Link></h3>
          <p><MapPinIcon aria-hidden="true" /> {hotel.location}</p>
          <Rating rating={hotel.rating} total={hotel.reviewsTotal} />
        </div>
        <div className="featured-price">
          {hotel.minPrice == null ? (
            <span>Нет свободных номеров</span>
          ) : (
            <>
              <small>от</small>
              <strong>{formatCurrency(hotel.minPrice * Math.max(1, nights))}</strong>
              <span>за {nights} {plural(nights, "ночь", "ночи", "ночей")}</span>
            </>
          )}
        </div>
        <Link to={path} navigate={navigate} className="secondary-button card-action">
          Выбрать номер <ArrowLongRightIcon aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function HomePage({ navigate }) {
  const initialSearch = useMemo(() => searchDefaults(), []);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.hotels.list({
        date_from: initialSearch.date_from,
        date_to: initialSearch.date_to,
        page: 1,
        per_page: 3,
        sort_by: "id",
        sort_order: "asc",
      });
      setHotels(await Promise.all(response.items.map((hotel) => enrichHotel(hotel, initialSearch))));
    } catch (exception) {
      setError(apiMessage(exception, "Не удалось загрузить подборку отелей."));
    } finally {
      setLoading(false);
    }
  }, [initialSearch]);

  useDeferredLoad(load);

  const startSearch = (values) => navigate(buildPath("/search", values));
  const chooseDestination = (location) => navigate(buildPath("/search", { ...initialSearch, location }));

  return (
    <main>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="script-kicker">Подобрано для спокойных выходных</p>
          <h1>Найдите место,<br />в которое захочется<br />вернуться</h1>
          <p className="hero-lede">Отели с атмосферой, честными отзывами и заботой о вашем отдыхе.</p>
        </div>
        <div className="hero-photo" aria-hidden="true">
          <img src="/images/hero-lake-como.png" alt="" />
        </div>
        <div className="hero-search">
          <SearchForm initial={initialSearch} onSearch={startSearch} />
          <div className="popular-destinations" id="destinations">
            <span>Популярные направления:</span>
            {["Москва", "Санкт-Петербург", "Сочи", "Казань", "Калининград", "Ярославль"].map((city) => (
              <button type="button" key={city} onClick={() => chooseDestination(city)}>{city}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Редакционная подборка</p>
            <h2 id="featured-title">Рекомендуем для новой поездки</h2>
          </div>
          <Link to={buildPath("/search", initialSearch)} navigate={navigate} className="underlined-link">
            Смотреть все отели <ArrowLongRightIcon aria-hidden="true" />
          </Link>
        </div>
        {loading ? <LoadingState label="Собираем доступные варианты…" compact /> : error ? (
          <ErrorState detail={error} onRetry={load} />
        ) : hotels.length ? (
          <div className="featured-grid">
            {hotels.map((hotel, index) => (
              <FeaturedHotelCard key={hotel.id} hotel={hotel} index={index} search={initialSearch} navigate={navigate} />
            ))}
          </div>
        ) : (
          <EmptyState title="Нет доступных отелей" detail="Попробуйте открыть полный поиск и изменить даты." />
        )}
      </section>

      <section className="trust-row" aria-label="Преимущества сервиса">
        <div><TagIcon aria-hidden="true" /><span><strong>Честные цены</strong><small>Цена фиксируется в брони</small></span></div>
        <div><ShieldCheckIcon aria-hidden="true" /><span><strong>Проверенные отзывы</strong><small>Только после завершённой поездки</small></span></div>
        <div><ClockIcon aria-hidden="true" /><span><strong>Надёжное бронирование</strong><small>Защита от конкурентного овербукинга</small></span></div>
      </section>

      <section className="inspiration-section" id="inspiration">
        <div className="inspiration-copy">
          <p className="eyebrow">Планируйте без спешки</p>
          <h2>Вся поездка — от поиска до отзыва — в одном месте</h2>
          <p>Сравните свободные номера, сохраните подтверждённую бронь в личном кабинете и поделитесь впечатлениями после выезда.</p>
          <Link to={buildPath("/search", initialSearch)} navigate={navigate} className="primary-button">Начать поиск</Link>
        </div>
        <div className="inspiration-points">
          <span><CheckBadgeIcon aria-hidden="true" /><strong>Актуальная доступность</strong><small>Запрашивается напрямую у backend</small></span>
          <span><SparklesIcon aria-hidden="true" /><strong>Реальные оценки</strong><small>Без демонстрационных рейтингов</small></span>
          <span><BuildingOffice2Icon aria-hidden="true" /><strong>Управление для отельеров</strong><small>Отдельные инструменты администратора</small></span>
        </div>
      </section>
    </main>
  );
}

function SearchResultCard({ hotel, params, navigate }) {
  const nights = nightsBetween(params.date_from, params.date_to);
  const path = buildPath(`/hotels/${hotel.id}`, params);
  const facilities = [...new Map(hotel.rooms.flatMap((room) => room.facilities || []).map((facility) => [facility.id, facility])).values()].slice(0, 4);
  return (
    <article className="search-result-card">
      <Link to={path} navigate={navigate} className="result-media-link">
        <HotelMedia hotel={hotel} large />
      </Link>
      <div className="result-copy">
        <div className="result-title-row">
          <div>
            <p className="result-type">Отель</p>
            <h2><Link to={path} navigate={navigate}>{hotel.title}</Link></h2>
            <p className="result-location"><MapPinIcon aria-hidden="true" /> {hotel.location}</p>
          </div>
          {hotel.rating != null && <span className="result-score">{hotel.rating.toFixed(1)}</span>}
        </div>
        <Rating rating={hotel.rating} total={hotel.reviewsTotal} />
        {facilities.length > 0 && (
          <ul className="facility-preview" aria-label="Удобства в доступных номерах">
            {facilities.map((facility) => <li key={facility.id}><CheckIcon aria-hidden="true" />{facility.title}</li>)}
          </ul>
        )}
        <div className="result-bottom">
          <div className="availability-copy">
            <strong>{hotel.rooms.length} {plural(hotel.rooms.length, "тип номера", "типа номера", "типов номеров")}</strong>
            <span>доступно на выбранные даты</span>
          </div>
          <div className="result-price">
            <small>за {nights} {plural(nights, "ночь", "ночи", "ночей")}</small>
            <strong>{hotel.minPrice == null ? "—" : `от ${formatCurrency(hotel.minPrice * Math.max(nights, 1))}`}</strong>
            <Link to={path} navigate={navigate} className="primary-button">Показать номера <ChevronRightIcon aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function SearchPage({ navigate, locationSearch }) {
  const raw = paramsToObject(locationSearch);
  const params = searchDefaults(raw);
  const page = Math.max(1, Number(raw.page) || 1);
  const perPage = 10;
  const sortBy = ["id", "title", "location"].includes(raw.sort_by) ? raw.sort_by : "id";
  const sortOrder = raw.sort_order === "desc" ? "desc" : "asc";
  const [response, setResponse] = useState({ items: [], total: 0, page, per_page: perPage });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(raw.title || "");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.hotels.list({
        date_from: params.date_from,
        date_to: params.date_to,
        location: params.location || undefined,
        title: raw.title || undefined,
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      const enriched = await Promise.all(result.items.map((hotel) => enrichHotel(hotel, {
        date_from: params.date_from,
        date_to: params.date_to,
      })));
      setResponse({ ...result, items: enriched });
    } catch (exception) {
      setError(apiMessage(exception, "Не удалось получить результаты поиска."));
    } finally {
      setLoading(false);
    }
  }, [page, params.date_from, params.date_to, params.location, raw.title, sortBy, sortOrder]);

  useDeferredLoad(load);

  const updateQuery = (changes) => navigate(buildPath("/search", {
    ...raw,
    ...params,
    ...changes,
    page: changes.page || 1,
  }));

  const submitTitle = (event) => {
    event.preventDefault();
    updateQuery({ title: title.trim() || undefined, page: 1 });
  };

  return (
    <main className="search-page">
      <section className="search-page-bar">
        <SearchForm initial={params} compact busy={loading} onSearch={(values) => updateQuery({ ...values, page: 1 })} />
      </section>
      <div className="search-page-heading">
        <div>
          <p className="breadcrumbs"><Link to="/" navigate={navigate}>Главная</Link><ChevronRightIcon aria-hidden="true" />Поиск отелей</p>
          <h1>{params.location ? `Отели: ${params.location}` : "Доступные отели"}</h1>
          <p>{formatDate(params.date_from)} — {formatDate(params.date_to)} · {params.guests} {plural(params.guests, "гость", "гостя", "гостей")}</p>
        </div>
        <span className="result-count">{response.total} {plural(response.total, "вариант", "варианта", "вариантов")}</span>
      </div>
      <div className="search-layout">
        <aside className="search-sidebar">
          <section className="sidebar-card sidebar-accent-card">
            <MapPinIcon aria-hidden="true" />
            <h2>Точный поиск</h2>
            <p>Результаты уже проверены на доступность в выбранный период.</p>
          </section>
          <form className="sidebar-card sidebar-form" onSubmit={submitTitle}>
            <label>
              Название отеля
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Точное название" />
            </label>
            <small>Backend поддерживает точное совпадение названия.</small>
            <button className="secondary-button" type="submit">Применить</button>
            {raw.title && <button className="text-button" type="button" onClick={() => updateQuery({ title: undefined })}>Сбросить название</button>}
          </form>
          <section className="sidebar-card">
            <h2>Почему здесь нет лишних фильтров?</h2>
            <p>Цена, звёздность и тип питания не входят в текущий API. EasyBook не показывает фильтры, которые дали бы неточный результат.</p>
          </section>
        </aside>
        <section className="results-column" aria-live="polite">
          <div className="results-toolbar">
            <span>Сортировка</span>
            <select value={`${sortBy}:${sortOrder}`} onChange={(event) => {
              const [nextSort, nextOrder] = event.target.value.split(":");
              updateQuery({ sort_by: nextSort, sort_order: nextOrder, page: 1 });
            }}>
              <option value="id:asc">По умолчанию</option>
              <option value="title:asc">По названию А—Я</option>
              <option value="title:desc">По названию Я—А</option>
              <option value="location:asc">По адресу А—Я</option>
              <option value="location:desc">По адресу Я—А</option>
            </select>
          </div>
          {loading ? <LoadingState label="Проверяем свободные номера…" /> : error ? (
            <ErrorState detail={error} onRetry={load} />
          ) : response.items.length ? (
            <>
              <div className="search-results-list">
                {response.items.map((hotel) => <SearchResultCard key={hotel.id} hotel={hotel} params={params} navigate={navigate} />)}
              </div>
              <Pagination page={response.page} perPage={response.per_page} total={response.total} onPage={(nextPage) => updateQuery({ page: nextPage })} />
            </>
          ) : (
            <EmptyState
              title="На эти даты ничего не найдено"
              detail="Попробуйте изменить город, точное название или период проживания."
              action={<button className="primary-button" type="button" onClick={() => updateQuery({ location: undefined, title: undefined })}>Сбросить направление</button>}
            />
          )}
        </section>
      </div>
    </main>
  );
}

export function HotelPage({ hotelId, navigate, locationSearch, user, onAuthRequired, notify }) {
  const params = searchDefaults(paramsToObject(locationSearch));
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [images, setImages] = useState([]);
  const [reviews, setReviews] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingRoomId, setBookingRoomId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hotelData, roomData, imageData, reviewData] = await Promise.all([
        api.hotels.get(hotelId),
        api.rooms.list(hotelId, { date_from: params.date_from, date_to: params.date_to }),
        api.images.list(hotelId),
        api.reviews.listHotel(hotelId, { page: 1, per_page: 100, sort_by: "created_at", sort_order: "desc" }),
      ]);
      setHotel(hotelData);
      setRooms(roomData);
      setImages(imageData);
      setReviews(reviewData);
    } catch (exception) {
      setError(apiMessage(exception, "Не удалось загрузить отель."));
    } finally {
      setLoading(false);
    }
  }, [hotelId, params.date_from, params.date_to]);

  useDeferredLoad(load);

  const book = async (room) => {
    if (!user) {
      onAuthRequired();
      return;
    }
    setBookingRoomId(room.id);
    try {
      const booking = await api.bookings.create({ room_id: room.id, date_from: params.date_from, date_to: params.date_to });
      notify("Бронирование подтверждено. Оно уже появилось в личном кабинете.");
      navigate(`/account/bookings/${booking.id}`);
    } catch (exception) {
      notify(apiMessage(exception, "Не удалось создать бронирование."), "error");
      if (exception instanceof ApiError && exception.status === 409) load();
    } finally {
      setBookingRoomId(null);
    }
  };

  if (loading) return <main className="hotel-page"><LoadingState label="Открываем страницу отеля…" /></main>;
  if (error || !hotel) return <main className="hotel-page"><ErrorState detail={error || "Отель не найден."} onRetry={load} /></main>;

  const allImages = images.map(imageUrl).filter(Boolean);
  const rating = averageRating(reviews.items);
  const nights = nightsBetween(params.date_from, params.date_to);

  return (
    <main className="hotel-page">
      <div className="hotel-breadcrumbs breadcrumbs">
        <Link to="/" navigate={navigate}>Главная</Link><ChevronRightIcon aria-hidden="true" />
        <Link to={buildPath("/search", params)} navigate={navigate}>Результаты поиска</Link><ChevronRightIcon aria-hidden="true" />
        <span>{hotel.title}</span>
      </div>
      <section className="hotel-title-block">
        <div>
          <p className="eyebrow">Отель</p>
          <h1>{hotel.title}</h1>
          <p><MapPinIcon aria-hidden="true" /> {hotel.location}</p>
        </div>
        <Rating rating={rating} total={reviews.total} />
      </section>
      {allImages.length ? (
        <section className={`hotel-gallery gallery-${Math.min(allImages.length, 5)}`} aria-label="Фотографии отеля">
          {allImages.slice(0, 5).map((source, index) => <img key={source} src={source} alt={`${hotel.title}, фото ${index + 1}`} />)}
        </section>
      ) : (
        <section className="hotel-gallery-empty"><PhotoIcon aria-hidden="true" /><span>Администратор пока не добавил фотографии</span></section>
      )}
      <section className="hotel-booking-search">
        <SearchForm initial={params} compact onSearch={(values) => navigate(buildPath(`/hotels/${hotel.id}`, values))} />
      </section>
      <div className="hotel-content-layout">
        <section className="rooms-section" aria-labelledby="rooms-title">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow">Доступно сейчас</p><h2 id="rooms-title">Выберите номер</h2></div>
            <span>{formatDate(params.date_from)} — {formatDate(params.date_to)}</span>
          </div>
          {rooms.length ? (
            <div className="hotel-room-list">
              {rooms.map((room) => (
                <article className="hotel-room-card" key={room.id}>
                  <div className="room-card-copy">
                    <h3>{room.title}</h3>
                    {room.description && <p>{room.description}</p>}
                    {room.facilities?.length > 0 && (
                      <ul>{room.facilities.map((facility) => <li key={facility.id}><CheckIcon aria-hidden="true" />{facility.title}</li>)}</ul>
                    )}
                    <span className="availability-badge">Доступно для бронирования</span>
                  </div>
                  <div className="room-card-action">
                    <small>{formatCurrency(room.price)} за ночь</small>
                    <strong>{formatCurrency(room.price * Math.max(1, nights))}</strong>
                    <span>за {nights} {plural(nights, "ночь", "ночи", "ночей")}</span>
                    <button className="primary-button" type="button" disabled={bookingRoomId === room.id} onClick={() => book(room)}>
                      {bookingRoomId === room.id ? "Бронируем…" : "Забронировать"}
                    </button>
                    <em>Окончательную доступность подтвердит сервер</em>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Свободных номеров нет" detail="Измените даты — отменённые бронирования сразу возвращаются в доступность." />
          )}
        </section>
        <aside className="hotel-facts">
          <h2>Условия EasyBook</h2>
          <p><ShieldCheckIcon aria-hidden="true" /><span><strong>Защита от овербукинга</strong>Доступность проверяется транзакционно.</span></p>
          <p><TagIcon aria-hidden="true" /><span><strong>Цена фиксируется</strong>Стоимость номера сохраняется в брони.</span></p>
          <p><CheckBadgeIcon aria-hidden="true" /><span><strong>Честные отзывы</strong>Оставить отзыв можно только после выезда.</span></p>
        </aside>
      </div>
      <section className="reviews-section" aria-labelledby="reviews-title">
        <div className="section-heading compact-heading">
          <div><p className="eyebrow">Впечатления гостей</p><h2 id="reviews-title">Отзывы об отеле</h2></div>
          <Rating rating={rating} total={reviews.total} />
        </div>
        {reviews.items.length ? (
          <div className="public-reviews-grid">
            {reviews.items.slice(0, 6).map((review) => (
              <article key={review.id}>
                <span className="review-score"><StarIcon aria-hidden="true" />{review.rating}.0</span>
                <p>{review.comment}</p>
                <time dateTime={review.created_at}>{formatDate(review.created_at)}</time>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Отзывов пока нет" detail="Первый отзыв сможет оставить гость после завершённой поездки." />
        )}
      </section>
    </main>
  );
}
