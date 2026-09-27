import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  LoaderCircle,
  MapPin,
  Search,
} from "lucide-react";

import { api } from "../api.js";
import { localDateKey } from "../dateUtils.js";
import { formatPrice } from "../utils/formatters.js";

const hotelFallback = "/images/hotel-fallback.jpg";

function useLocationSuggestions(value, setValue) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const selectedValue = useRef(null);

  useEffect(() => {
    if (selectedValue.current === value) {
      selectedValue.current = null;
      return undefined;
    }
    selectedValue.current = null;
    const query = value.trim();
    if (query.length < 2) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.locations
        .suggest(query, { signal: controller.signal })
        .then((data) => {
          setItems(data);
          setOpen(true);
        })
        .catch((error) => {
          if (error.name !== "AbortError") setItems([]);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const dismiss = () => {
    setItems([]);
    setOpen(false);
  };
  const choose = (label) => {
    selectedValue.current = label;
    dismiss();
    setValue(label);
  };
  return {
    items,
    open: open && value.trim().length >= 2,
    show: () => setOpen(true),
    dismiss,
    choose,
  };
}

function SearchBar({ values, setValues, onSubmit, busy }) {
  const suggestions = useLocationSuggestions(values.location, (location) =>
    setValues((current) => ({ ...current, location })),
  );
  const setField = (field, value) =>
    setValues((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    suggestions.dismiss();
    onSubmit(event);
  };

  return (
    <form
      className="search-bar"
      onSubmit={submit}
      aria-label="Поиск доступных отелей"
    >
      <label className="search-field location-field">
        <span>
          <MapPin size={18} /> Куда
        </span>
        <input
          value={values.location}
          onChange={(event) => {
            if (event.target.value.trim().length < 2) suggestions.dismiss();
            setField("location", event.target.value);
          }}
          onFocus={() =>
            values.location.length > 1 &&
            suggestions.items.length &&
            suggestions.show()
          }
          placeholder="Город или страна"
          autoComplete="off"
        />
        {suggestions.open && suggestions.items.length > 0 && (
          <div className="suggestions">
            {suggestions.items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => suggestions.choose(item.label)}
              >
                <MapPin size={16} />
                <span>
                  {item.city}
                  <small>{item.country}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </label>
      <label className="search-field">
        <span>
          <CalendarDays size={18} /> Заезд
        </span>
        <input
          type="date"
          min={localDateKey()}
          value={values.date_from}
          onChange={(event) => setField("date_from", event.target.value)}
        />
      </label>
      <label className="search-field">
        <span>
          <CalendarDays size={18} /> Выезд
        </span>
        <input
          type="date"
          min={values.date_from}
          value={values.date_to}
          onChange={(event) => setField("date_to", event.target.value)}
        />
      </label>
      <label className="search-field sort-field">
        <span>Сортировка</span>
        <select
          value={`${values.sort_by}:${values.sort_order}`}
          onChange={(event) => {
            const [sort_by, sort_order] = event.target.value.split(":");
            setValues((current) => ({ ...current, sort_by, sort_order }));
          }}
        >
          <option value="id:asc">По умолчанию</option>
          <option value="title:asc">Название А–Я</option>
          <option value="title:desc">Название Я–А</option>
          <option value="location:asc">Город А–Я</option>
        </select>
        <ChevronDown className="sort-chevron" size={16} aria-hidden="true" />
      </label>
      <button className="search-submit" type="submit" disabled={busy}>
        {busy ? <LoaderCircle className="spin" /> : <Search />}
        <span>Найти</span>
      </button>
    </form>
  );
}

function HotelCard({ hotel, featured, dates }) {
  const fallback = hotelFallback;
  const href = `/hotels/${hotel.id}?date_from=${dates.date_from}&date_to=${dates.date_to}`;
  return (
    <a className={`hotel-card ${featured ? "featured" : ""}`} href={href}>
      <img
        src={hotel.image || fallback}
        alt={`Фотография для карточки отеля ${hotel.title}`}
        onError={(event) => {
          if (!event.currentTarget.src.endsWith(fallback))
            event.currentTarget.src = fallback;
        }}
      />
      <span className="card-shade" />
      {hotel.price !== null && (
        <span className="price-badge">
          <strong>{formatPrice(hotel.price)}</strong> / ночь
        </span>
      )}
      <span className="hotel-copy">
        <strong>{hotel.title}</strong>
        <small>
          <MapPin />
          {hotel.location}
        </small>
      </span>
    </a>
  );
}

function Catalog({ hotels, loading, error, dates }) {
  if (loading)
    return (
      <div className="catalog-state">
        <LoaderCircle className="spin" />
        Проверяем доступные номера…
      </div>
    );
  if (error) return <div className="catalog-state error">{error}</div>;
  if (!hotels.length)
    return (
      <div className="catalog-state">
        На выбранные даты отелей не найдено. Попробуйте другой город или период.
      </div>
    );
  const featuredHotels = hotels.slice(0, 5);
  const remainingHotels = hotels.slice(5, 9);
  return (
    <>
      <div className="picked-grid">
        {featuredHotels.map((hotel, index) => (
          <HotelCard
            key={hotel.id}
            hotel={hotel}
            featured={index === 0}
            dates={dates}
          />
        ))}
      </div>
      {remainingHotels.length > 0 && (
        <div className="hotel-row">
          {remainingHotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              dates={dates}
            />
          ))}
        </div>
      )}
    </>
  );
}

function HeroBackground() {
  return (
    <div className="hero-background" aria-hidden="true">
      <span className="hero-blob hero-blob--right" />
      <span className="hero-blob hero-blob--middle" />
      <span className="hero-blob hero-blob--left" />
      <svg
        className="hero-lines"
        viewBox="0 0 1440 570"
        preserveAspectRatio="none"
      >
        <path d="M-138 410C-18 344 91 398 176 489C218 534 270 566 344 589" />
        <path d="M1018 -76C1106 28 1240 66 1506 -18" />
        <path d="M1468 104C1318 180 1288 322 1486 447" />
        <path d="M615 36C548 92 537 176 593 231C616 254 646 271 681 280" />
      </svg>
    </div>
  );
}

export default function HomePage({
  user,
  values,
  setValues,
  query,
  hotels,
  loading,
  error,
  onSearch,
  onNavigate,
}) {
  return (
    <>
      <main id="top">
        <section className="hero">
          <HeroBackground />
          <div className="hero-copy">
            <h1>
              Забудьте о суете.
              <br />
              Начните <em>отдыхать.</em>
            </h1>
            <p className="hero-lead">
              От уютных городских отелей до вилл у океана — найдите место, в
              которое захочется вернуться.
            </p>
            <a className="primary-link" href="#catalog">
              Выбрать отель <ArrowRight />
            </a>
          </div>
          <div className="hero-visual">
            <span className="outline-frame" />
            <div className="hero-image-frame">
              <img
                className="hero-image"
                src="/images/hero-stay.jpg"
                alt="Островной курорт с бунгало над водой"
              />
            </div>
          </div>
        </section>
        <section className="search-wrap">
          <SearchBar
            values={values}
            setValues={setValues}
            onSubmit={onSearch}
            busy={loading}
          />
        </section>
        <section className="catalog-section" id="catalog">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Выбор гостей</p>
              <h2>
                {query.location
                  ? `Отели — ${query.location}`
                  : "Популярные отели"}
              </h2>
            </div>
            <a href="#top">
              Изменить поиск <ArrowRight />
            </a>
          </div>
          <Catalog
            hotels={hotels}
            loading={loading}
            error={error}
            dates={query}
          />
        </section>
      </main>
      <footer id="footer">
        <a className="brand" href="#top">
          <span>Easy</span>Book.
        </a>
        <p>Бронируем хорошее путешествие — быстро и честно.</p>
        <nav>
          <a href="#catalog">Отели</a>
          <button
            type="button"
            onClick={() => onNavigate(user ? "/account" : "/login")}
          >
            Личный кабинет
          </button>
        </nav>
        <small>© 2026 EasyBook. Курсовой проект по базам данных.</small>
      </footer>
    </>
  );
}
