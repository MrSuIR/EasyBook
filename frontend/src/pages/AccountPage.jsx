import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  CircleX,
  LoaderCircle,
  MessageSquare,
  Moon,
  Pencil,
  Star,
  Trash2,
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
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

function formatNights(booking) {
  const nights = Math.round(
    (new Date(`${booking.date_to}T00:00:00`) -
      new Date(`${booking.date_from}T00:00:00`)) /
      86400000,
  );
  const suffix =
    nights % 10 === 1 && nights % 100 !== 11
      ? "ночь"
      : nights % 10 >= 2 &&
          nights % 10 <= 4 &&
          (nights % 100 < 10 || nights % 100 >= 20)
        ? "ночи"
        : "ночей";
  return `${nights} ${suffix}`;
}

function getStatus(booking) {
  if (booking.status === "cancelled") return ["cancelled", "Отменено"];
  if (booking.date_to <= localDateKey()) return ["completed", "Завершено"];
  return ["confirmed", "Подтверждено"];
}

function ProfileNavigation({ user, active, onSelect }) {
  return (
    <aside className="account-profile-card">
      <div className="account-profile">
        <span className="account-profile-avatar" aria-hidden="true">
          {user.first_name.charAt(0).toUpperCase()}
        </span>
        <span className="account-profile-copy">
          <strong>
            {user.first_name} {user.last_name}
          </strong>
          <small>{user.email}</small>
        </span>
      </div>
      <nav
        className="account-profile-nav"
        aria-label="Навигация личного кабинета"
      >
        <button
          className={active === "bookings" ? "active" : ""}
          type="button"
          onClick={() => onSelect("bookings")}
        >
          <CalendarDays />
          Мои бронирования
        </button>
        <button
          className={active === "reviews" ? "active" : ""}
          type="button"
          onClick={() => onSelect("reviews")}
        >
          <MessageSquare />
          Мои отзывы
        </button>
        <button
          className={active === "profile" ? "active" : ""}
          type="button"
          onClick={() => onSelect("profile")}
        >
          <UserRound />
          Личные данные
        </button>
      </nav>
    </aside>
  );
}

function ProfileEditor({ user, onUserUpdate }) {
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const updated = await api.auth.updateProfile(form);
      onUserUpdate(updated);
      setMessage("Личные данные сохранены.");
    } catch (exception) {
      setError(exception.message);
    }
  };
  return (
    <section className="bookings-panel profile-editor">
      <header className="profile-editor-heading">
        <div className="profile-editor-mark" aria-hidden="true">
          {form.first_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p>Профиль гостя</p>
          <h2>Личные данные</h2>
          <span>Используем их для бронирований и связи с вами.</span>
        </div>
      </header>
      <form onSubmit={submit}>
        <div className="profile-field-grid">
          <label>
            <span>Имя</span>
            <input
              required
              maxLength="100"
              autoComplete="given-name"
              value={form.first_name}
              onChange={(event) =>
                setForm({ ...form, first_name: event.target.value })
              }
            />
          </label>
          <label>
            <span>Фамилия</span>
            <input
              required
              maxLength="100"
              autoComplete="family-name"
              value={form.last_name}
              onChange={(event) =>
                setForm({ ...form, last_name: event.target.value })
              }
            />
          </label>
          <label className="profile-email-field">
            <span>Email</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
            <small>На этот адрес привязана ваша учётная запись.</small>
          </label>
        </div>
        <div className="profile-editor-actions">
          <div aria-live="polite">
            {message && <p className="profile-success">{message}</p>}
            {error && (
              <p className="booking-load-error" role="alert">{error}</p>
            )}
          </div>
          <button className="profile-save-button" type="submit">
            Сохранить изменения
          </button>
        </div>
      </form>
    </section>
  );
}

function ReviewsPanel({ reviews, onReviewsChange }) {
  const [editing, setEditing] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const update = async (review) => {
    const draft = drafts[`review-${review.id}`] || {
      rating: review.rating,
      comment: review.comment,
    };
    try {
      await api.reviews.update(review.id, {
        rating: Number(draft.rating),
        comment: draft.comment,
      });
      setEditing(null);
      await onReviewsChange();
    } catch (exception) {
      setError(exception.message);
    }
  };
  const remove = async (review) => {
    if (!window.confirm("Удалить отзыв?")) return;
    try {
      await api.reviews.delete(review.id);
      await onReviewsChange();
    } catch (exception) {
      setError(exception.message);
    }
  };
  return (
    <section className="bookings-panel reviews-account">
      <h2>Мои отзывы</h2>
      {error && (
        <div className="booking-load-error" role="alert">
          {error}
        </div>
      )}
      {reviews.map((review) => {
        const isEditing = editing === review.id;
        const draft = drafts[`review-${review.id}`] || {
          rating: review.rating,
          comment: review.comment,
        };
        return (
          <article className="review-editor published" key={review.id}>
            <header>
              <div>
                <span>
                  {Array.from({ length: review.rating }, (_, index) => (
                    <Star key={index} />
                  ))}
                </span>
                <h3>Бронирование № {review.booking_id}</h3>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(isEditing ? null : review.id);
                    setDrafts((current) => ({
                      ...current,
                      [`review-${review.id}`]: {
                        rating: review.rating,
                        comment: review.comment,
                      },
                    }));
                  }}
                >
                  <Pencil />
                </button>
                <button type="button" onClick={() => remove(review)}>
                  <Trash2 />
                </button>
              </div>
            </header>
            {isEditing ? (
              <>
                <label>
                  Оценка
                  <select
                    value={draft.rating}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [`review-${review.id}`]: {
                          ...draft,
                          rating: event.target.value,
                        },
                      }))
                    }
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Комментарий
                  <textarea
                    maxLength="2000"
                    value={draft.comment}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [`review-${review.id}`]: {
                          ...draft,
                          comment: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <button type="button" onClick={() => update(review)}>
                  Сохранить
                </button>
              </>
            ) : (
              <p>{review.comment}</p>
            )}
          </article>
        );
      })}
      {!reviews.length && (
        <div className="booking-past-empty">
          <MessageSquare />
          <p>Вы пока не оставляли отзывов.</p>
          <small>
            Оставить отзыв можно в завершённом бронировании.
          </small>
        </div>
      )}
    </section>
  );
}

function ReviewComposer({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.reviews.create({ booking_id: booking.id, rating, comment });
      await onSubmitted();
      onClose();
    } catch (exception) {
      setError(exception.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="review-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>Завершённая поездка</span>
            <h2 id="review-modal-title">Поделитесь впечатлениями</h2>
            <p>Бронирование № {booking.id}</p>
          </div>
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            <CircleX />
          </button>
        </header>
        <form onSubmit={submit}>
          <fieldset>
            <legend>Ваша оценка</legend>
            <div className="review-rating" aria-label={`${rating} из 5`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  className={value <= rating ? "active" : ""}
                  type="button"
                  key={value}
                  aria-label={`${value} из 5`}
                  onClick={() => setRating(value)}
                >
                  <Star />
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            Что особенно запомнилось?
            <textarea
              required
              autoFocus
              maxLength="2000"
              rows="6"
              placeholder="Расскажите о номере, сервисе и впечатлениях от поездки"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          {error && <p className="booking-load-error" role="alert">{error}</p>}
          <div className="review-modal-actions">
            <button type="button" className="secondary" onClick={onClose}>Позже</button>
            <button type="submit" disabled={saving || !comment.trim()}>
              {saving ? <LoaderCircle className="spin" /> : <Star />}
              {saving ? "Публикуем…" : "Опубликовать отзыв"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BookingCard({ booking, cancelling, hasReview, onCancel, onNavigate, onReview }) {
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
      <img
        className="booking-card-image"
        src="/images/hotel-fallback.jpg"
        alt="Иллюстрация отеля"
      />
      <div className="booking-card-content">
        <header className="booking-card-header">
          <div>
            <h3>Бронирование № {booking.id}</h3>
            <p>Тип номера № {booking.room_id}</p>
          </div>
          <span className={`booking-status ${statusClass}`}>
            {statusClass === "cancelled" ? <CircleX /> : <CircleCheck />}
            {statusLabel}
          </span>
        </header>

        <div className="booking-meta">
          {metadata.map(([label, value], index) => {
            const Icon = metaIcons[index];
            return (
              <div className="booking-meta-item" key={label}>
                <span>
                  <Icon />
                  {label}
                </span>
                <strong>{value}</strong>
              </div>
            );
          })}
        </div>

        <div className="booking-card-bottom">
          <div className="booking-summary">
            <span>
              <small>Создано</small>
              <strong>{formatDate(booking.created_at.slice(0, 10))}</strong>
            </span>
            <span className="booking-total">
              <small>Итого</small>
              <strong>{currencyFormatter.format(booking.total_cost)}</strong>
            </span>
          </div>
          <div className="booking-actions">
            {statusClass === "completed" && !hasReview && (
              <button
                className="booking-review-button"
                type="button"
                onClick={() => onReview(booking)}
              >
                <Star />
                Оставить отзыв
              </button>
            )}
            {statusClass === "completed" && hasReview && (
              <span className="booking-reviewed"><CircleCheck /> Отзыв опубликован</span>
            )}
            <button
              className="booking-details-button"
              type="button"
              onClick={() =>
                onNavigate(
                  `/hotels/${booking.hotel_id}?date_from=${booking.date_from}&date_to=${booking.date_to}`,
                )
              }
            >
              Перейти к отелю
              <ArrowUpRight />
            </button>
            {statusClass === "confirmed" && (
              <button
                className="booking-cancel-button"
                type="button"
                disabled={cancelling}
                onClick={() => onCancel(booking.id)}
              >
                <CircleX />
                {cancelling ? "Отменяем…" : "Отменить бронь"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AccountPage({ user, onNavigate, onUserUpdate }) {
  const [area, setArea] = useState("bookings");
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const [tab, setTab] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewBooking, setReviewBooking] = useState(null);

  const loadReviews = useCallback(async () => {
    const items = await api.reviews.mine();
    setReviews(items);
  }, []);

  useEffect(() => {
    const request = window.requestAnimationFrame(() => {
      loadReviews().catch(() => setReviews([]));
    });
    return () => window.cancelAnimationFrame(request);
  }, [loadReviews, user.id]);

  useEffect(() => {
    const controller = new AbortController();
    api.bookings
      .mine({ signal: controller.signal })
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
      setBookings((items) =>
        items.map((booking) =>
          booking.id === updated.id ? { ...booking, ...updated } : booking,
        ),
      );
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
        <div
          className={mobileNavigation ? "account-navigation-mobile-open" : ""}
        >
          <ProfileNavigation
            user={user}
            active={area}
            onSelect={(value) => {
              setArea(value);
              setMobileNavigation(false);
            }}
          />
        </div>

        {area === "bookings" && (
          <section className="bookings-panel" aria-labelledby="bookings-title">
            <h2 id="bookings-title">Мои бронирования</h2>
            <div
              className="booking-tabs"
              role="tablist"
              aria-label="Период бронирований"
            >
              {tabs.map(([id, label]) => (
                <button
                  className={tab === id ? "active" : ""}
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  type="button"
                  onClick={() => setTab(id)}
                >
                  {label} ({filterBookings(currentBookings, id).length})
                </button>
              ))}
            </div>
            <div className="booking-list">
              {currentError && (
                <div className="booking-load-error" role="alert">
                  <p>{currentError}</p>
                  <button type="button" onClick={reloadBookings}>
                    Повторить
                  </button>
                </div>
              )}
              {isLoading ? (
                <div className="booking-past-empty">
                  <LoaderCircle className="spin" />
                  <p>Загружаем ваши бронирования…</p>
                </div>
              ) : !currentError && visibleBookings.length ? (
                visibleBookings.map((booking) => (
                  <BookingCard
                    booking={booking}
                    key={booking.id}
                    cancelling={cancellingId === booking.id}
                    hasReview={reviews.some(
                      (review) => review.booking_id === booking.id,
                    )}
                    onCancel={cancelBooking}
                    onNavigate={onNavigate}
                    onReview={setReviewBooking}
                  />
                ))
              ) : (
                !currentError && (
                  <div className="booking-past-empty">
                    <CalendarDays />
                    <p>
                      {tab === "upcoming"
                        ? "Предстоящих бронирований пока нет."
                        : tab === "past"
                          ? "Завершённых бронирований пока нет."
                          : "Отменённых бронирований пока нет."}
                    </p>
                    {currentBookings.length === 0 && (
                      <button type="button" onClick={() => onNavigate("/")}>
                        Выбрать отель
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        )}
        {area === "reviews" && (
          <ReviewsPanel reviews={reviews} onReviewsChange={loadReviews} />
        )}
        {area === "profile" && (
          <ProfileEditor user={user} onUserUpdate={onUserUpdate} />
        )}
      </div>
      <button
        className="account-mobile-menu"
        type="button"
        aria-label="Открыть меню профиля"
        aria-expanded={mobileNavigation}
        onClick={() => setMobileNavigation((value) => !value)}
      >
        <ChevronDown />
      </button>
      {reviewBooking && (
        <ReviewComposer
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitted={loadReviews}
        />
      )}
    </main>
  );
}
