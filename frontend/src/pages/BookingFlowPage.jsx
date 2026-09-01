import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Users,
} from "lucide-react";

import { api } from "../api.js";
import ThemeToggle from "../theme.jsx";
import { formatPrice } from "../utils/formatters.js";

const fallbackImage = "/images/hero-stay.png";

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function nightsBetween(dateFrom, dateTo) {
  return Math.max(
    0,
    Math.round(
      (new Date(`${dateTo}T00:00:00`) - new Date(`${dateFrom}T00:00:00`)) /
        86400000,
    ),
  );
}

function Stepper({ step }) {
  const steps = ["Ваши данные", "Оплата", "Готово"];
  return (
    <ol className="checkout-steps" aria-label="Этапы оформления бронирования">
      {steps.map((label, index) => {
        const number = index + 1;
        const state = number < step ? "done" : number === step ? "active" : "";
        return (
          <li
            className={state}
            key={label}
            aria-current={number === step ? "step" : undefined}
          >
            <span>{number < step ? <Check aria-hidden="true" /> : number}</span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}

function BookingSummary({ hotel, room, image, dateFrom, dateTo, nights }) {
  const total = room.price * nights;
  return (
    <aside className="checkout-summary">
      <img src={image} alt={hotel.title} />
      <div className="checkout-summary-copy">
        <p className="checkout-kicker">Ваше бронирование</p>
        <h2>{hotel.title}</h2>
        <p className="checkout-location">
          <MapPin />
          {hotel.location}
        </p>
        <div className="checkout-room-name">
          <strong>{room.title}</strong>
          <span>{room.description}</span>
        </div>
        <dl className="checkout-stay-details">
          <div>
            <dt>
              <CalendarDays />
              Заезд
            </dt>
            <dd>{formatDate(dateFrom)}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays />
              Выезд
            </dt>
            <dd>{formatDate(dateTo)}</dd>
          </div>
          <div>
            <dt>
              <Users />
              Проживание
            </dt>
            <dd>
              {nights} {nights === 1 ? "ночь" : nights < 5 ? "ночи" : "ночей"}
            </dd>
          </div>
        </dl>
        <div className="checkout-price-row">
          <span>
            {formatPrice(room.price)} × {nights}
          </span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <div className="checkout-total-row">
          <span>Итого</span>
          <strong>{formatPrice(total)}</strong>
        </div>
      </div>
    </aside>
  );
}

export default function BookingFlowPage({ user, onNavigate }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const hotelId = Number(params.get("hotel_id"));
  const roomId = Number(params.get("room_id"));
  const dateFrom = params.get("date_from") || "";
  const dateTo = params.get("date_to") || "";
  const nights = nightsBetween(dateFrom, dateTo);
  const paramsValid = Boolean(
    hotelId && roomId && dateFrom && dateTo && nights,
  );
  const [step, setStep] = useState(1);
  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [image, setImage] = useState(fallbackImage);
  const [loading, setLoading] = useState(paramsValid);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(
    paramsValid
      ? ""
      : "Не удалось восстановить параметры бронирования. Вернитесь к выбору номера.",
  );
  const [booking, setBooking] = useState(null);
  const [guest, setGuest] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
    phone: "",
  });
  const [payment, setPayment] = useState({
    cardholder: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  useEffect(() => {
    if (!paramsValid) return undefined;
    const controller = new AbortController();
    Promise.all([
      api.hotels.get(hotelId, { signal: controller.signal }),
      api.rooms.list(
        hotelId,
        { date_from: dateFrom, date_to: dateTo },
        { signal: controller.signal },
      ),
      api.images.list(hotelId, { signal: controller.signal }),
    ])
      .then(([hotelData, rooms, images]) => {
        const selectedRoom = rooms.find((item) => item.id === roomId);
        if (!selectedRoom)
          throw new Error("Выбранный номер больше недоступен на эти даты.");
        setHotel(hotelData);
        setRoom(selectedRoom);
        const source = images[0]?.original_url;
        if (source) setImage(source.startsWith("/") ? source : `/${source}`);
      })
      .catch((exception) => {
        if (exception.name !== "AbortError") setError(exception.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [dateFrom, dateTo, hotelId, nights, paramsValid, roomId]);

  const updateGuest = (event) =>
    setGuest((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const updatePayment = (event) =>
    setPayment((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  const continueToPayment = (event) => {
    event.preventDefault();
    setError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmBooking = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await api.bookings.create({
        room_id: roomId,
        date_from: dateFrom,
        date_to: dateTo,
      });
      setBooking(result);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (exception) {
      setError(
        exception.code === "room_unavailable"
          ? "Этот номер только что забронировали. Вернитесь к отелю и выберите другой вариант."
          : exception.message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <main className="checkout-state">
        <LoaderCircle className="spin" />
        Подготавливаем бронирование…
      </main>
    );
  if (error && (!hotel || !room))
    return (
      <main className="checkout-state checkout-state-error">
        <p>{error}</p>
        <button
          type="button"
          onClick={() =>
            onNavigate(
              hotelId
                ? `/hotels/${hotelId}?date_from=${dateFrom}&date_to=${dateTo}`
                : "/",
            )
          }
        >
          Вернуться к выбору номера
        </button>
      </main>
    );

  return (
    <main className="checkout-page">
      <header className="checkout-header">
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
        <div className="checkout-header-actions">
          <ThemeToggle />
          <button
            type="button"
            onClick={() =>
              onNavigate(
                `/hotels/${hotelId}?date_from=${dateFrom}&date_to=${dateTo}`,
              )
            }
          >
            <ArrowLeft />
            Вернуться к отелю
          </button>
        </div>
      </header>
      <Stepper step={step} />

      {step < 3 && (
        <div className="checkout-layout">
          <section className="checkout-form-card">
            {step === 1 && (
              <form onSubmit={continueToPayment}>
                <p className="checkout-kicker">Шаг 1 из 2</p>
                <h1>Кто будет проживать?</h1>
                <p className="checkout-lead">
                  Укажите контактные данные гостя. Мы сохраним бронь в вашем
                  личном кабинете.
                </p>
                <div className="checkout-field-grid">
                  <label>
                    Имя
                    <input
                      name="firstName"
                      value={guest.firstName}
                      onChange={updateGuest}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label>
                    Фамилия
                    <input
                      name="lastName"
                      value={guest.lastName}
                      onChange={updateGuest}
                      autoComplete="family-name"
                      required
                    />
                  </label>
                  <label className="wide">
                    Электронная почта
                    <input
                      name="email"
                      type="email"
                      value={guest.email}
                      onChange={updateGuest}
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label className="wide">
                    Телефон
                    <input
                      name="phone"
                      type="tel"
                      value={guest.phone}
                      onChange={updateGuest}
                      placeholder="+7 999 000-00-00"
                      autoComplete="tel"
                    />
                  </label>
                </div>
                <label className="checkout-checkbox">
                  <input type="checkbox" defaultChecked />
                  <span>
                    <strong>Я бронирую для себя</strong>
                    <small>Имя гостя совпадает с владельцем аккаунта</small>
                  </span>
                </label>
                <button className="checkout-primary" type="submit">
                  Перейти к оплате
                  <ArrowRight />
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={confirmBooking} noValidate>
                <p className="checkout-kicker">Шаг 2 из 2</p>
                <h1>Данные оплаты</h1>
                <p className="checkout-lead">
                  Это демонстрационная форма: данные карты не проверяются, не
                  сохраняются и никуда не отправляются.
                </p>
                <div className="checkout-field-grid payment-fields">
                  <label className="wide">
                    Имя владельца карты
                    <input
                      name="cardholder"
                      value={payment.cardholder}
                      onChange={updatePayment}
                      placeholder="IVAN IVANOV"
                      autoComplete="off"
                    />
                  </label>
                  <label className="wide">
                    Номер карты
                    <span className="checkout-card-input">
                      <CreditCard />
                      <input
                        name="cardNumber"
                        value={payment.cardNumber}
                        onChange={updatePayment}
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </span>
                  </label>
                  <label>
                    Срок действия
                    <input
                      name="expiry"
                      value={payment.expiry}
                      onChange={updatePayment}
                      placeholder="ММ / ГГ"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    CVC
                    <input
                      name="cvc"
                      value={payment.cvc}
                      onChange={updatePayment}
                      placeholder="000"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                </div>
                {error && (
                  <p className="checkout-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="checkout-actions">
                  <button
                    className="checkout-secondary"
                    type="button"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft />
                    Назад
                  </button>
                  <button
                    className="checkout-primary"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle className="spin" />
                        Подтверждаем…
                      </>
                    ) : (
                      <>
                        Подтвердить бронирование
                        <LockKeyhole />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>
          <BookingSummary
            hotel={hotel}
            room={room}
            image={image}
            dateFrom={dateFrom}
            dateTo={dateTo}
            nights={nights}
          />
        </div>
      )}

      {step === 3 && (
        <section className="checkout-success-card">
          <span className="checkout-success-icon">
            <CheckCircle2 />
          </span>
          <p className="checkout-kicker">Бронирование подтверждено</p>
          <h1>Отлично, {guest.firstName}!</h1>
          <p>
            Номер в <strong>{hotel.title}</strong> забронирован. Бронь уже
            появилась в вашем личном кабинете.
          </p>
          <div className="checkout-confirmation-number">
            <span>Номер бронирования</span>
            <strong>№ {booking.id}</strong>
          </div>
          <div className="checkout-confirmation-details">
            <span>
              <CalendarDays />
              {formatDate(dateFrom)} — {formatDate(dateTo)}
            </span>
            <span>
              <MapPin />
              {hotel.location}
            </span>
            <strong>{formatPrice(booking.total_cost)}</strong>
          </div>
          <div className="checkout-success-actions">
            <button
              className="checkout-primary"
              type="button"
              onClick={() => onNavigate("/account")}
            >
              Мои бронирования
              <ArrowRight />
            </button>
            <button
              className="checkout-secondary"
              type="button"
              onClick={() => onNavigate("/")}
            >
              На главную
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
