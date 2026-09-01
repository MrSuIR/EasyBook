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

const fallbackImages = [
  "/images/hero-stay.png",
  "/images/account-radisson.jpg",
  "/images/account-metropol.jpg",
];

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
        <span>
          <ChevronDown size={18} /> Сортировка
        </span>
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
        <ChevronDown size={16} />
      </label>
      <button className="search-submit" type="submit" disabled={busy}>
        {busy ? <LoaderCircle className="spin" /> : <Search />}
        <span>Найти</span>
      </button>
    </form>
  );
}

function HotelCard({ hotel, index, featured, dates }) {
  const fallback = fallbackImages[index % fallbackImages.length];
  const href = `/hotels/${hotel.id}?date_from=${dates.date_from}&date_to=${dates.date_to}`;
  return (
    <a className={`hotel-card ${featured ? "featured" : ""}`} href={href}>
      <img
        src={hotel.image || fallback}
        alt={`Фотография отеля ${hotel.title}`}
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
            index={index}
            featured={index === 0}
            dates={dates}
          />
        ))}
      </div>
      {remainingHotels.length > 0 && (
        <div className="hotel-row">
          {remainingHotels.map((hotel, index) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              index={index + 5}
              dates={dates}
            />
          ))}
        </div>
      )}
    </>
  );
}

function RouteDecoration() {
  const points = [
    [532, 405],
    [1018, 678],
    [350, 805],
    [622, 1198],
  ];
  return (
    <div className="home-backdrop" aria-hidden="true">
      <span className="home-contour home-contour-top" />
      <span className="home-contour home-contour-bottom" />
      <svg
        className="home-route"
        viewBox="0 0 1440 1700"
        preserveAspectRatio="none"
      >
        <path d="M-80 250C210 115 275 465 532 405C770 350 832 112 1110 212C1358 302 1260 610 1018 678C748 753 520 640 350 805C160 990 310 1212 622 1198C924 1184 985 1398 1510 1320" />
        <g>
          {points.flatMap(([cx, cy]) => [
            <circle key={`${cx}-${cy}-outer`} cx={cx} cy={cy} r="8" />,
            <circle key={`${cx}-${cy}-inner`} cx={cx} cy={cy} r="3" />,
          ])}
        </g>
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
        <RouteDecoration />
        <section className="hero">
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
                src="/images/hero-stay.png"
                alt="Светлый номер с панорамными окнами и видом на море"
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
