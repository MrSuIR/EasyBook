import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Moon,
  UserRound,
} from "lucide-react";

import { api } from "../api.js";
import { filterBookings, localDateKey } from "../accountBookings.js";

const metaIcons = [CalendarDays, CalendarDays, CalendarDays, Moon, Moon];
const tabs = [
  ["upcoming", "Предстоящие"],
  ["past", "Завершённые"],
  ["cancelled", "Отменённые"],
];
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
const currencyFormatter = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

function formatNights(booking) {
  const nights = Math.round((new Date(`${booking.date_to}T00:00:00`) - new Date(`${booking.date_from}T00:00:00`)) / 86400000);
  const suffix = nights % 10 === 1 && nights % 100 !== 11 ? "ночь" : nights % 10 >= 2 && nights % 10 <= 4 && (nights % 100 < 10 || nights % 100 >= 20) ? "ночи" : "ночей";
  return `${nights} ${suffix}`;
}

function getStatus(booking) {
  if (booking.status === "cancelled") return ["cancelled", "Отменено"];
  if (booking.date_to <= localDateKey()) return ["completed", "Завершено"];
  return ["confirmed", "Подтверждено"];
}

function ProfileNavigation({ user }) {
  return (
    <aside className="account-profile-card">
      <div className="account-profile">
        <span className="account-profile-avatar" aria-hidden="true">{user.first_name.charAt(0).toUpperCase()}</span>
        <span className="account-profile-copy"><strong>{user.first_name} {user.last_name}</strong><small>{user.email}</small></span>
      </div>
      <nav className="account-profile-nav" aria-label="Навигация личного кабинета">
        <button className="active" type="button"><CalendarDays />Мои бронирования</button>
        <button type="button"><UserRound />Личные данные</button>
      </nav>
    </aside>
  );
}

function BookingCard({ booking, cancelling, onCancel, onNavigate }) {
  const nights = formatNights(booking);
  const [statusClass, statusLabel] = getStatus(booking);
  const metadata = [
    ["№ бронирования", `№ ${booking.id}`],
    ["Заезд", formatDate(booking.date_from)],
    ["Выезд", formatDate(booking.date_to)],
    ["Ночи", nights],
    ["Цена за ночь", currencyFormatter.format(booking.price)],
  ];

  return (
    <article className="booking-card">
      <img className="booking-card-image" src={`/static/images/hotels/stay-${(booking.room_id % 9) + 1}.jpg`} alt="Интерьер номера" />
      <div className="booking-card-content">
        <header className="booking-card-header">
          <div>
            <h3>Бронирование № {booking.id}</h3>
            <p>Тип номера № {booking.room_id}</p>
          </div>
          <span className={`booking-status ${statusClass}`}>{statusClass === "cancelled" ? <CircleX /> : <CircleCheck />}{statusLabel}</span>
        </header>

        <div className="booking-meta">
          {metadata.map(([label, value], index) => {
            const Icon = metaIcons[index];
            return <div className="booking-meta-item" key={label}><span><Icon />{label}</span><strong>{value}</strong></div>;
          })}
        </div>

        <div className="booking-card-bottom">
          <div className="booking-summary">
            <span><small>Создано</small><strong>{formatDate(booking.created_at.slice(0, 10))}</strong></span>
            <span className="booking-total"><small>Итого</small><strong>{currencyFormatter.format(booking.total_cost)}</strong></span>
          </div>
          <div className="booking-actions">
            <button className="booking-details-button" type="button" onClick={() => onNavigate(`/hotels/${booking.hotel_id}?date_from=${booking.date_from}&date_to=${booking.date_to}`)}>Перейти к отелю<ArrowUpRight /></button>
            {statusClass === "confirmed" && <button className="booking-cancel-button" type="button" disabled={cancelling} onClick={() => onCancel(booking.id)}><CircleX />{cancelling ? "Отменяем…" : "Отменить бронь"}</button>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AccountPage({ user, onNavigate }) {
  const [tab, setTab] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api.bookings.mine({ signal: controller.signal })
      .then((items) => {
        setBookings(items);
        setLoadedUserId(user.id);
        setError("");
      })
      .catch((exception) => {
        if (exception.name !== "AbortError") {
          setBookings([]);
          setLoadedUserId(user.id);
          setError(exception.message || "Не удалось загрузить бронирования.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user.id, reloadKey]);

  const currentBookings = loadedUserId === user.id ? bookings : [];
  const currentError = loadedUserId === user.id ? error : "";
  const isLoading = loading || loadedUserId !== user.id;
  const visibleBookings = filterBookings(currentBookings, tab);

  const reloadBookings = () => {
    setLoading(true);
    setError("");
    setReloadKey((value) => value + 1);
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm(`Отменить бронирование № ${bookingId}?`)) return;
    setCancellingId(bookingId);
    setError("");
    try {
      const updated = await api.bookings.cancel(bookingId);
      setBookings((items) => items.map((booking) => booking.id === updated.id ? { ...booking, ...updated } : booking));
      setTab("cancelled");
    } catch (exception) {
      setError(exception.message || "Не удалось отменить бронирование.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="account-page">
      <section className="account-intro" aria-labelledby="account-title">
        <h1 id="account-title">Личный кабинет</h1>
        <p>Здравствуйте, {user.first_name}!</p>
      </section>

      <div className="account-layout">
        <ProfileNavigation user={user} />

        <section className="bookings-panel" aria-labelledby="bookings-title">
          <h2 id="bookings-title">Мои бронирования</h2>
          <div className="booking-tabs" role="tablist" aria-label="Период бронирований">
            {tabs.map(([id, label]) => <button className={tab === id ? "active" : ""} key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)}>{label} ({filterBookings(currentBookings, id).length})</button>)}
          </div>
          <div className="booking-list">
            {currentError && <div className="booking-load-error" role="alert"><p>{currentError}</p><button type="button" onClick={reloadBookings}>Повторить</button></div>}
            {isLoading ? <div className="booking-past-empty"><LoaderCircle className="spin" /><p>Загружаем ваши бронирования…</p></div> : !currentError && visibleBookings.length ? visibleBookings.map((booking) => <BookingCard booking={booking} key={booking.id} cancelling={cancellingId === booking.id} onCancel={cancelBooking} onNavigate={onNavigate} />) : !currentError && <div className="booking-past-empty"><CalendarDays /><p>{tab === "upcoming" ? "Предстоящих бронирований пока нет." : tab === "past" ? "Завершённых бронирований пока нет." : "Отменённых бронирований пока нет."}</p>{currentBookings.length === 0 && <button type="button" onClick={() => onNavigate("/")}>Выбрать отель</button>}</div>}
          </div>
        </section>
      </div>
      <button className="account-mobile-menu" type="button" aria-label="Открыть меню профиля"><ChevronDown /></button>
    </main>
  );
}
