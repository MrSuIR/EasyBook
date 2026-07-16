import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  IdentificationIcon,
  PencilSquareIcon,
  ReceiptPercentIcon,
  TrashIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/20/solid";
import { api } from "../api.js";

const accountSections = [
  { id: "overview", label: "Обзор", path: "/account", icon: UserCircleIcon },
  { id: "bookings", label: "Бронирования", path: "/account/bookings", icon: CalendarDaysIcon },
  { id: "reviews", label: "Отзывы", path: "/account/reviews", icon: ChatBubbleLeftRightIcon },
];

const statusLabels = {
  confirmed: "Подтверждено",
  cancelled: "Отменено",
};

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormatter.format(date);
}

function formatCurrency(value) {
  return Number.isFinite(Number(value)) ? currencyFormatter.format(Number(value)) : "—";
}

function getErrorMessage(error, fallback) {
  return typeof error?.message === "string" && error.message.trim() ? error.message : fallback;
}

function StatusBadge({ status }) {
  const cancelled = status === "cancelled";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
        cancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
      }`}
    >
      {cancelled ? <XCircleIcon className="size-3.5" /> : <CheckCircleIcon className="size-3.5" />}
      {statusLabels[status] ?? status}
    </span>
  );
}

function Rating({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Оценка: ${value} из 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          className={`size-4 ${index < value ? "text-orange-600" : "text-stone-200"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function LoadingState({ label = "Загружаем данные…" }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-[18px] border border-stone-200 bg-white text-sm text-stone-500">
      <ArrowPathIcon className="mr-2 size-5 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function EmptyState({ icon: Icon, title, copy, action }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-[18px] border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <Icon className="size-9 text-orange-700" strokeWidth={1.5} aria-hidden="true" />
      <h3 className="mt-4 font-display text-3xl font-medium text-stone-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-stone-500">{copy}</p>
      {action}
    </div>
  );
}

function BookingCard({ booking, onOpen, onCancel, cancelling, compact = false }) {
  const canRequestCancellation = booking.status !== "cancelled";

  return (
    <article className="rounded-[18px] border border-stone-200 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
            Бронирование #{booking.id}
          </p>
          <h3 className="mt-2 font-display text-3xl font-medium leading-none text-stone-900">
            Номер типа #{booking.room_id}
          </h3>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <dl className={`mt-6 grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
        <div className="rounded-xl bg-stone-50 p-3.5">
          <dt className="text-[10px] uppercase tracking-[0.1em] text-stone-500">Заезд</dt>
          <dd className="mt-1 text-sm font-semibold text-stone-900">{formatDate(booking.date_from)}</dd>
        </div>
        <div className="rounded-xl bg-stone-50 p-3.5">
          <dt className="text-[10px] uppercase tracking-[0.1em] text-stone-500">Выезд</dt>
          <dd className="mt-1 text-sm font-semibold text-stone-900">{formatDate(booking.date_to)}</dd>
        </div>
        {!compact && (
          <>
            <div className="rounded-xl bg-stone-50 p-3.5">
              <dt className="text-[10px] uppercase tracking-[0.1em] text-stone-500">Цена за ночь</dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">{formatCurrency(booking.price)}</dd>
            </div>
            <div className="rounded-xl bg-stone-50 p-3.5">
              <dt className="text-[10px] uppercase tracking-[0.1em] text-stone-500">Итого</dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">{formatCurrency(booking.total_cost)}</dd>
            </div>
          </>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <span className="text-xs text-stone-500">Создано {formatDateTime(booking.created_at)}</span>
        <div className="flex flex-wrap items-center gap-2">
          {canRequestCancellation && onCancel && (
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
              onClick={() => onCancel(booking.id)}
              disabled={cancelling}
            >
              {cancelling ? "Отменяем…" : "Отменить"}
            </button>
          )}
          {onOpen && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950 px-3.5 py-2 text-xs font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-emerald-900 active:scale-[0.97]"
              onClick={() => onOpen(booking.id)}
            >
              Подробнее <ChevronRightIcon className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ReviewForm({ bookingId, initialReview, busy, onSubmit, onCancel }) {
  const editing = Boolean(initialReview);
  const [form, setForm] = useState(() => ({
    booking_id: String(bookingId ?? initialReview?.booking_id ?? ""),
    rating: String(initialReview?.rating ?? 5),
    comment: initialReview?.comment ?? "",
  }));
  const [validationError, setValidationError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const comment = form.comment.trim();
    const parsedBookingId = Number(form.booking_id);

    if (!editing && (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0)) {
      setValidationError("Укажите корректный ID бронирования.");
      return;
    }
    if (!comment) {
      setValidationError("Комментарий обязателен.");
      return;
    }

    setValidationError("");
    const payload = editing
      ? { rating: Number(form.rating), comment }
      : { booking_id: parsedBookingId, rating: Number(form.rating), comment };
    const succeeded = await onSubmit(payload);

    if (succeeded && !editing) {
      setForm((current) => ({ ...current, comment: "", rating: "5" }));
    }
  };

  return (
    <form className="rounded-[18px] border border-stone-200 bg-white p-5 md:p-6" onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
            {editing ? `Отзыв #${initialReview.id}` : "Новый отзыв"}
          </p>
          <h3 className="mt-2 font-display text-3xl font-medium text-stone-900">
            {editing ? "Изменить впечатления" : "Поделиться впечатлениями"}
          </h3>
        </div>
        {editing && <Rating value={Number(form.rating)} />}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
        <label className="grid gap-2 text-xs font-semibold text-stone-700">
          ID бронирования
          <input
            className="min-h-12 rounded-xl border border-stone-300 bg-white px-3.5 text-sm outline-none transition-[border-color,box-shadow] focus:border-orange-600 focus:ring-4 focus:ring-orange-100 disabled:bg-stone-100"
            type="number"
            min="1"
            required
            disabled={editing || bookingId != null}
            value={form.booking_id}
            onChange={(event) => setForm({ ...form, booking_id: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-xs font-semibold text-stone-700">
          Оценка
          <select
            className="min-h-12 rounded-xl border border-stone-300 bg-white px-3.5 text-sm outline-none transition-[border-color,box-shadow] focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
            value={form.rating}
            onChange={(event) => setForm({ ...form, rating: event.target.value })}
          >
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>{rating} из 5</option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 grid gap-2 text-xs font-semibold text-stone-700">
        Комментарий
        <textarea
          className="min-h-36 resize-y rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-sm leading-6 outline-none transition-[border-color,box-shadow] focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
          required
          maxLength={2000}
          value={form.comment}
          onChange={(event) => setForm({ ...form, comment: event.target.value })}
          placeholder="Расскажите, что особенно запомнилось"
        />
      </label>
      <div className="mt-1 flex justify-between gap-4 text-[11px] text-stone-500">
        <span>{validationError && <span className="text-red-700" role="alert">{validationError}</span>}</span>
        <span>{form.comment.length}/2000</span>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100"
            onClick={onCancel}
            disabled={busy}
          >
            Закрыть
          </button>
        )}
        <button
          type="submit"
          className="rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-emerald-900 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Сохраняем…" : editing ? "Сохранить изменения" : "Опубликовать отзыв"}
        </button>
      </div>
    </form>
  );
}

function ReviewCard({ review, onEdit, onDelete, deleting }) {
  return (
    <article className="rounded-[18px] border border-stone-200 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
            Отзыв #{review.id}
          </p>
          <h3 className="mt-2 font-display text-2xl font-medium text-stone-900">
            Бронирование #{review.booking_id}
          </h3>
        </div>
        <Rating value={review.rating} />
      </div>
      <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-stone-700">{review.comment}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <span className="text-xs text-stone-500">
          Обновлено {formatDateTime(review.updated_at ?? review.created_at)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100"
            onClick={() => onEdit(review.id)}
          >
            <PencilSquareIcon className="size-4" aria-hidden="true" /> Изменить
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
            onClick={() => onDelete(review.id)}
            disabled={deleting}
          >
            <TrashIcon className="size-4" aria-hidden="true" /> {deleting ? "Удаляем…" : "Удалить"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AccountPages({
  section = "overview",
  detailId,
  user,
  navigate,
  notify,
  onAuthRequired,
}) {
  const activeSection = ["overview", "bookings", "booking", "reviews"].includes(section)
    ? section
    : "overview";
  const userId = user?.id;
  const callbacksRef = useRef({ notify, onAuthRequired });
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [bookingReview, setBookingReview] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelConfirmationId, setCancelConfirmationId] = useState(null);
  const [savingReview, setSavingReview] = useState(false);
  const [loadingReviewId, setLoadingReviewId] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState(null);

  useEffect(() => {
    callbacksRef.current = { notify, onAuthRequired };
  }, [notify, onAuthRequired]);

  useEffect(() => {
    if (!userId) {
      callbacksRef.current.onAuthRequired?.();
      return undefined;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setPageError("");
      setActionError("");
      setEditingReview(null);

      try {
        if (activeSection === "booking") {
          const bookingId = Number(detailId);
          if (!Number.isInteger(bookingId) || bookingId <= 0) {
            throw new Error("Некорректный ID бронирования.");
          }

          const [booking, ownReviews] = await Promise.all([
            api.bookings.get(bookingId),
            api.reviews.listMine(),
          ]);
          const reviewSummary = ownReviews.find((review) => review.booking_id === booking.id);
          const fullReview = reviewSummary ? await api.reviews.get(reviewSummary.id) : null;

          if (active) {
            setBookingDetail(booking);
            setReviews(ownReviews);
            setBookingReview(fullReview);
          }
          return;
        }

        if (activeSection === "bookings") {
          const ownBookings = await api.bookings.listMine();
          if (active) setBookings(ownBookings);
          return;
        }

        if (activeSection === "reviews") {
          const [ownReviews, ownBookings] = await Promise.all([
            api.reviews.listMine(),
            api.bookings.listMine(),
          ]);
          if (active) {
            setReviews(ownReviews);
            setBookings(ownBookings);
          }
          return;
        }

        const [ownBookings, ownReviews] = await Promise.all([
          api.bookings.listMine(),
          api.reviews.listMine(),
        ]);
        if (active) {
          setBookings(ownBookings);
          setReviews(ownReviews);
        }
      } catch (error) {
        if (!active) return;
        if (error?.status === 401) {
          callbacksRef.current.onAuthRequired?.();
          return;
        }
        setPageError(getErrorMessage(error, "Не удалось загрузить данные аккаунта."));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [activeSection, detailId, reloadKey, userId]);

  const reportActionError = (error, fallback) => {
    if (error?.status === 401) {
      callbacksRef.current.onAuthRequired?.();
      return;
    }
    const message = getErrorMessage(error, fallback);
    setActionError(message);
    callbacksRef.current.notify?.(message, "error");
  };

  const openBooking = (bookingId) => navigate?.(`/account/bookings/${bookingId}`);

  const cancelBooking = async (bookingId) => {
    setCancellingId(bookingId);
    setActionError("");
    try {
      const updated = await api.bookings.cancel(bookingId);
      setBookings((current) => current.map((booking) => (booking.id === updated.id ? updated : booking)));
      setBookingDetail((current) => (current?.id === updated.id ? updated : current));
      setCancelConfirmationId(null);
      callbacksRef.current.notify?.(`Бронирование #${updated.id} отменено.`);
    } catch (error) {
      reportActionError(error, "Не удалось отменить бронирование.");
    } finally {
      setCancellingId(null);
    }
  };

  const createReview = async (payload) => {
    setSavingReview(true);
    setActionError("");
    try {
      const created = await api.reviews.create(payload);
      setReviews((current) => [created, ...current.filter((review) => review.id !== created.id)]);
      if (bookingDetail?.id === created.booking_id) setBookingReview(created);
      callbacksRef.current.notify?.(`Отзыв #${created.id} опубликован.`);
      return true;
    } catch (error) {
      reportActionError(error, "Не удалось опубликовать отзыв.");
      return false;
    } finally {
      setSavingReview(false);
    }
  };

  const startEditingReview = async (reviewId) => {
    setLoadingReviewId(reviewId);
    setActionError("");
    try {
      const review = await api.reviews.get(reviewId);
      setEditingReview(review);
    } catch (error) {
      reportActionError(error, "Не удалось загрузить отзыв.");
    } finally {
      setLoadingReviewId(null);
    }
  };

  const updateReview = async (payload) => {
    if (!editingReview) return false;
    setSavingReview(true);
    setActionError("");
    try {
      const updated = await api.reviews.update(editingReview.id, payload);
      setReviews((current) => current.map((review) => (review.id === updated.id ? updated : review)));
      setBookingReview((current) => (current?.id === updated.id ? updated : current));
      setEditingReview(null);
      callbacksRef.current.notify?.(`Отзыв #${updated.id} обновлён.`);
      return true;
    } catch (error) {
      reportActionError(error, "Не удалось обновить отзыв.");
      return false;
    } finally {
      setSavingReview(false);
    }
  };

  const deleteReview = async (reviewId) => {
    setDeletingReviewId(reviewId);
    setActionError("");
    try {
      await api.reviews.remove(reviewId);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      setBookingReview((current) => (current?.id === reviewId ? null : current));
      setEditingReview((current) => (current?.id === reviewId ? null : current));
      setDeleteConfirmationId(null);
      callbacksRef.current.notify?.(`Отзыв #${reviewId} удалён.`);
    } catch (error) {
      reportActionError(error, "Не удалось удалить отзыв.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const sectionCopy = useMemo(() => {
    if (activeSection === "bookings") return ["Ваши поездки", "Все бронирования и их актуальные статусы."];
    if (activeSection === "booking") return ["Детали поездки", "Данные бронирования из EasyBook."];
    if (activeSection === "reviews") return ["Ваши отзывы", "Впечатления о завершённых поездках."];
    return ["Личный кабинет", "Поездки, отзывы и важные детали в одном месте."];
  }, [activeSection]);

  if (!user) {
    return (
      <main className="mx-auto min-h-[calc(100vh-72px)] w-full max-w-[1440px] px-5 py-12 md:px-10">
        <EmptyState
          icon={IdentificationIcon}
          title="Войдите в аккаунт"
          copy="Бронирования и отзывы доступны только владельцу аккаунта."
          action={(
            <button
              type="button"
              className="mt-6 rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-emerald-900 active:scale-[0.97]"
              onClick={() => callbacksRef.current.onAuthRequired?.()}
            >
              Войти
            </button>
          )}
        />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-stone-50">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-9 md:px-10 lg:py-12">
        <button
          type="button"
          className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-stone-600 transition-colors hover:text-orange-700"
          onClick={() => navigate?.("/")}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> На главную
        </button>

        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-stone-200 pb-8">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">EasyBook · аккаунт</p>
            <h1 className="mt-2 font-display text-5xl font-medium leading-[0.95] tracking-[-0.035em] text-stone-900 md:text-6xl">
              {sectionCopy[0]}
            </h1>
            <p className="mt-4 text-sm text-stone-500">{sectionCopy[1]}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-right">
            <strong className="block text-sm text-stone-900">{user.email}</strong>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">
              {user.role === "admin" ? "Администратор" : "Клиент"} · ID {user.id}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          <nav className="flex gap-2 overflow-x-auto lg:sticky lg:top-5 lg:h-fit lg:flex-col" aria-label="Разделы аккаунта">
            {accountSections.map((item) => {
              const ItemIcon = item.icon;
              const selected = item.id === activeSection || (item.id === "bookings" && activeSection === "booking");
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex min-h-11 flex-none items-center gap-3 rounded-xl px-3.5 text-left text-sm font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.98] ${
                    selected ? "bg-emerald-950 text-white" : "text-stone-600 hover:bg-white hover:text-stone-900"
                  }`}
                  onClick={() => navigate?.(item.path)}
                  aria-current={selected ? "page" : undefined}
                >
                  <ItemIcon className="size-5" strokeWidth={1.7} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
            {actionError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {actionError}
              </div>
            )}

            {loading ? (
              <LoadingState />
            ) : pageError ? (
              <div className="rounded-[18px] border border-red-200 bg-white p-6">
                <h2 className="font-display text-3xl font-medium text-stone-900">Не удалось загрузить раздел</h2>
                <p className="mt-2 text-sm leading-6 text-red-700" role="alert">{pageError}</p>
                <button
                  type="button"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-emerald-900 active:scale-[0.97]"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  <ArrowPathIcon className="size-4" aria-hidden="true" /> Повторить
                </button>
              </div>
            ) : activeSection === "overview" ? (
              <div className="grid gap-8">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-stone-200 bg-white p-5">
                    <CalendarDaysIcon className="size-6 text-orange-700" strokeWidth={1.5} aria-hidden="true" />
                    <strong className="mt-5 block font-display text-4xl font-medium">{bookings.length}</strong>
                    <span className="text-xs text-stone-500">Бронирований</span>
                  </div>
                  <div className="rounded-[18px] border border-stone-200 bg-white p-5">
                    <CheckCircleIcon className="size-6 text-emerald-800" strokeWidth={1.5} aria-hidden="true" />
                    <strong className="mt-5 block font-display text-4xl font-medium">
                      {bookings.filter((booking) => booking.status === "confirmed").length}
                    </strong>
                    <span className="text-xs text-stone-500">Подтверждено</span>
                  </div>
                  <div className="rounded-[18px] border border-stone-200 bg-white p-5">
                    <ChatBubbleLeftRightIcon className="size-6 text-orange-700" strokeWidth={1.5} aria-hidden="true" />
                    <strong className="mt-5 block font-display text-4xl font-medium">{reviews.length}</strong>
                    <span className="text-xs text-stone-500">Отзывов</span>
                  </div>
                </div>

                <section>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">Последнее</p>
                      <h2 className="mt-1 font-display text-3xl font-medium">Бронирования</h2>
                    </div>
                    <button type="button" className="text-xs font-semibold text-orange-700" onClick={() => navigate?.("/account/bookings")}>Смотреть все</button>
                  </div>
                  {bookings.length ? (
                    <div className="grid gap-4">
                      {bookings.slice(0, 2).map((booking) => (
                        <BookingCard key={booking.id} booking={booking} compact onOpen={openBooking} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={CalendarDaysIcon} title="Поездок пока нет" copy="Найдите отель и выберите доступный номер." />
                  )}
                </section>
              </div>
            ) : activeSection === "bookings" ? (
              bookings.length ? (
                <div className="grid gap-4">
                  {bookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onOpen={openBooking}
                      onCancel={() => setCancelConfirmationId(booking.id)}
                      cancelling={cancellingId === booking.id}
                    />
                  ))}
                  {cancelConfirmationId && (
                    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-4 shadow-xl" role="dialog" aria-modal="true" aria-label="Подтверждение отмены">
                      <p className="m-0 text-sm font-semibold text-stone-900">Отменить бронирование #{cancelConfirmationId}?</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">Окончательное решение примет сервер по действующим правилам бронирования.</p>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100" onClick={() => setCancelConfirmationId(null)}>Не отменять</button>
                        <button type="button" className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" onClick={() => void cancelBooking(cancelConfirmationId)} disabled={cancellingId === cancelConfirmationId}>Подтвердить</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState icon={CalendarDaysIcon} title="Бронирований нет" copy="После выбора номера бронь появится в этом разделе." />
              )
            ) : activeSection === "booking" ? (
              bookingDetail ? (
                <div className="grid gap-6">
                  <BookingCard
                    booking={bookingDetail}
                    onCancel={() => setCancelConfirmationId(bookingDetail.id)}
                    cancelling={cancellingId === bookingDetail.id}
                  />
                  <section className="rounded-[18px] border border-stone-200 bg-white p-5 md:p-6">
                    <h2 className="font-display text-3xl font-medium text-stone-900">Служебные данные</h2>
                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs text-stone-500">ID пользователя</dt><dd className="mt-1 font-semibold">{bookingDetail.user_id}</dd></div>
                      <div><dt className="text-xs text-stone-500">ID типа номера</dt><dd className="mt-1 font-semibold">{bookingDetail.room_id}</dd></div>
                      <div><dt className="text-xs text-stone-500">Создано</dt><dd className="mt-1 font-semibold">{formatDateTime(bookingDetail.created_at)}</dd></div>
                      <div><dt className="text-xs text-stone-500">Отменено</dt><dd className="mt-1 font-semibold">{formatDateTime(bookingDetail.cancelled_at)}</dd></div>
                    </dl>
                  </section>

                  <section>
                    <div className="mb-4">
                      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">После поездки</p>
                      <h2 className="mt-1 font-display text-3xl font-medium">Отзыв о бронировании</h2>
                    </div>
                    {bookingReview ? (
                      editingReview?.id === bookingReview.id ? (
                        <ReviewForm key={editingReview.id} initialReview={editingReview} busy={savingReview} onSubmit={updateReview} onCancel={() => setEditingReview(null)} />
                      ) : (
                        <ReviewCard review={bookingReview} onEdit={startEditingReview} onDelete={() => setDeleteConfirmationId(bookingReview.id)} deleting={deletingReviewId === bookingReview.id || loadingReviewId === bookingReview.id} />
                      )
                    ) : (
                      <ReviewForm key={`booking-${bookingDetail.id}`} bookingId={bookingDetail.id} busy={savingReview} onSubmit={createReview} />
                    )}
                  </section>

                  {cancelConfirmationId && (
                    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-4 shadow-xl" role="dialog" aria-modal="true" aria-label="Подтверждение отмены">
                      <p className="m-0 text-sm font-semibold text-stone-900">Отменить бронирование #{cancelConfirmationId}?</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">Сервер проверит дату заезда, статус и наличие отзыва.</p>
                      <div className="mt-4 flex justify-end gap-2">
                        <button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100" onClick={() => setCancelConfirmationId(null)}>Не отменять</button>
                        <button type="button" className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" onClick={() => void cancelBooking(cancelConfirmationId)} disabled={cancellingId === cancelConfirmationId}>Подтвердить</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState icon={ReceiptPercentIcon} title="Бронирование не найдено" copy="Проверьте адрес страницы или вернитесь к списку бронирований." />
              )
            ) : (
              <div className="grid gap-8">
                {editingReview ? (
                  <ReviewForm key={editingReview.id} initialReview={editingReview} busy={savingReview} onSubmit={updateReview} onCancel={() => setEditingReview(null)} />
                ) : (
                  <ReviewForm key="new-review" busy={savingReview} onSubmit={createReview} />
                )}

                <section>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">Опубликовано</p>
                      <h2 className="mt-1 font-display text-3xl font-medium">Все отзывы</h2>
                    </div>
                    <span className="text-xs text-stone-500">Доступные ID броней: {bookings.map((booking) => booking.id).join(", ") || "—"}</span>
                  </div>
                  {reviews.length ? (
                    <div className="grid gap-4">
                      {reviews.map((review) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          onEdit={startEditingReview}
                          onDelete={() => setDeleteConfirmationId(review.id)}
                          deleting={deletingReviewId === review.id || loadingReviewId === review.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={ChatBubbleLeftRightIcon} title="Отзывов пока нет" copy="После завершённой поездки создайте отзыв по ID бронирования. Сервер проверит право публикации." />
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteConfirmationId(null)}>
          <section className="w-full max-w-md rounded-2xl bg-white p-6" role="dialog" aria-modal="true" aria-labelledby="delete-review-title">
            <h2 id="delete-review-title" className="font-display text-3xl font-medium text-stone-900">Удалить отзыв #{deleteConfirmationId}?</h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">Отзыв будет удалён физически. Для этой брони его можно будет создать снова.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100" onClick={() => setDeleteConfirmationId(null)}>Оставить</button>
              <button type="button" className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void deleteReview(deleteConfirmationId)} disabled={deletingReviewId === deleteConfirmationId}>{deletingReviewId === deleteConfirmationId ? "Удаляем…" : "Удалить"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
