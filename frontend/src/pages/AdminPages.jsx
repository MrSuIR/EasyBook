import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeModernIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { api, ApiError } from "../api.js";

const panelClass = "rounded-2xl border border-stone-200 bg-white shadow-sm";
const inputClass =
  "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-stone-100";
const textareaClass =
  "min-h-28 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-stone-100";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-55";
const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-55";
const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-55";
const iconClass = "h-5 w-5";

const navItems = [
  { key: "hotels", label: "Отели", href: "/admin/hotels", icon: BuildingOffice2Icon },
  { key: "facilities", label: "Удобства", href: "/admin/facilities", icon: WrenchScrewdriverIcon },
  { key: "bookings", label: "Бронирования", href: "/admin/bookings", icon: UsersIcon },
  { key: "analytics", label: "Аналитика", href: "/admin/analytics", icon: ChartBarSquareIcon },
];

const hotelSortOptions = [
  { value: "id", label: "ID" },
  { value: "title", label: "Название" },
  { value: "location", label: "Адрес" },
];

const bookingSortOptions = [
  { value: "id", label: "ID" },
  { value: "date_from", label: "Дата заезда" },
  { value: "date_to", label: "Дата выезда" },
  { value: "price", label: "Цена" },
  { value: "status", label: "Статус" },
];

const analyticsSortOptions = [
  { value: "hotel_id", label: "ID отеля" },
  { value: "hotel_title", label: "Название отеля" },
  { value: "confirmed_bookings", label: "Подтверждённые брони" },
  { value: "cancelled_bookings", label: "Отменённые брони" },
  { value: "booked_revenue", label: "Выручка" },
  { value: "booked_nights", label: "Ночи" },
  { value: "average_rating", label: "Средняя оценка" },
  { value: "cancellation_rate", label: "Процент отмен" },
];

const emptyHotelForm = { title: "", location: "" };
const emptyRoomForm = {
  title: "",
  description: "",
  price: "",
  quantity: "",
  facilities_ids: [],
};

function localDateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function defaultStayDates() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 1);
  return { date_from: localDateInput(from), date_to: localDateInput(to) };
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(String(value).length === 10 ? value + "T12:00:00" : value));
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatMetric(value, suffix = "") {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(number) + suffix;
}

function errorMessage(error) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Не удалось выполнить запрос.";
}

function announce(notify, message, type = "success") {
  if (typeof notify === "function") notify(message, type);
}

function normalisePage(payload, fallbackPage, fallbackPerPage) {
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    total: Number(payload?.total ?? 0),
    page: Number(payload?.page ?? fallbackPage),
    per_page: Number(payload?.per_page ?? fallbackPerPage),
  };
}

function navigateFallback(path) {
  window.location.assign(path);
}

function useDeferredLoad(load) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
}

function Field({ label, hint, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
      <span>{label}</span>
      {children}
      {hint && <small className="font-normal leading-5 text-stone-500">{hint}</small>}
    </label>
  );
}

function ActionError({ error }) {
  if (!error) return null;
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-800" role="alert">
      {errorMessage(error)}
    </p>
  );
}

function LoadingState({ label = "Загружаем данные…" }) {
  return (
    <div className={panelClass + " grid min-h-52 place-items-center p-8 text-center"} aria-live="polite">
      <div className="grid justify-items-center gap-3 text-stone-500">
        <ArrowPathIcon className="h-7 w-7 animate-spin" aria-hidden="true" />
        <p className="m-0 text-sm">{label}</p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry, title = "Не удалось загрузить данные" }) {
  return (
    <div className={panelClass + " grid min-h-52 place-items-center p-8 text-center"} role="alert">
      <div className="grid max-w-md justify-items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-red-100 text-red-800">
          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="m-0 text-lg font-bold text-stone-900">{title}</h2>
        <p className="m-0 text-sm leading-6 text-stone-600">{errorMessage(error)}</p>
        {onRetry && (
          <button className={secondaryButtonClass} type="button" onClick={onRetry}>
            <ArrowPathIcon className={iconClass} aria-hidden="true" />
            Повторить
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = HomeModernIcon, title, detail, action }) {
  return (
    <div className={panelClass + " grid min-h-52 place-items-center p-8 text-center"}>
      <div className="grid max-w-md justify-items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-stone-100 text-stone-600">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="m-0 text-lg font-bold text-stone-900">{title}</h2>
        {detail && <p className="m-0 text-sm leading-6 text-stone-600">{detail}</p>}
        {action}
      </div>
    </div>
  );
}

function PageHeading({ eyebrow = "Панель администратора", title, detail, actions, onBack }) {
  return (
    <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {onBack && (
          <button
            className="mb-3 inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-semibold text-stone-600 hover:text-emerald-900"
            type="button"
            onClick={onBack}
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Назад
          </button>
        )}
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-orange-700">{eyebrow}</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">{title}</h1>
        {detail && <p className="mb-0 mt-2 max-w-3xl text-sm leading-6 text-stone-600">{detail}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

function AdminLayout({ section, user, navigate, children }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto grid w-full max-w-[1600px] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-stone-200 bg-white px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-6 lg:py-7">
          <button
            className="border-0 bg-transparent p-0 text-left font-serif text-3xl font-semibold tracking-tight text-stone-950"
            type="button"
            onClick={() => navigate("/")}
          >
            EasyBook
          </button>
          <p className="mb-5 mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Управление сервисом</p>
          <nav className="flex gap-2 overflow-x-auto lg:grid" aria-label="Разделы администратора">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.key || (item.key === "hotels" && ["rooms", "images"].includes(section));
              return (
                <button
                  className={
                    "inline-flex min-h-11 flex-none items-center gap-3 rounded-xl border-0 px-3 text-sm font-semibold transition lg:w-full " +
                    (active
                      ? "bg-emerald-950 text-white"
                      : "bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-950")
                  }
                  type="button"
                  key={item.key}
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigate(item.href)}
                >
                  <Icon className={iconClass} aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-6 hidden border-t border-stone-200 pt-5 lg:block">
            <p className="m-0 truncate text-sm font-semibold text-stone-900">{user.email}</p>
            <p className="mb-0 mt-1 text-xs text-stone-500">Администратор</p>
          </div>
        </aside>
        <main className="min-w-0 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}

function AccessState({ user, navigate }) {
  const authenticated = Boolean(user);
  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 p-5">
      <section className={panelClass + " w-full max-w-lg p-8 text-center"}>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-orange-800">
          <UsersIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mb-0 mt-5 text-xs font-bold uppercase tracking-[0.14em] text-orange-700">EasyBook Admin</p>
        <h1 className="mb-0 mt-2 text-3xl font-bold tracking-tight text-stone-950">
          {authenticated ? "Недостаточно прав" : "Требуется авторизация"}
        </h1>
        <p className="mb-0 mt-3 text-sm leading-6 text-stone-600">
          {authenticated
            ? "Этот раздел доступен только пользователям с ролью администратора."
            : "Войдите в учётную запись администратора, чтобы продолжить."}
        </p>
        <button className={primaryButtonClass + " mt-6"} type="button" onClick={() => navigate("/")}>
          Вернуться на главную
        </button>
      </section>
    </main>
  );
}

function Pagination({ page, perPage, total, onPageChange, onPerPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 text-sm text-stone-600">
        Всего: <strong className="text-stone-900">{total}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          На странице
          <select
            className="min-h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm text-stone-900"
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
          >
            {[10, 20, 50, 100].map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          className={secondaryButtonClass + " min-h-9 px-2.5"}
          type="button"
          aria-label="Предыдущая страница"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="min-w-24 text-center text-sm font-semibold text-stone-800">
          {page} / {totalPages}
        </span>
        <button
          className={secondaryButtonClass + " min-h-9 px-2.5"}
          type="button"
          aria-label="Следующая страница"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function SortFields({ sortBy, sortOrder, options, onSortBy, onSortOrder }) {
  return (
    <>
      <Field label="Сортировка">
        <select className={inputClass} value={sortBy} onChange={(event) => onSortBy(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Порядок">
        <select className={inputClass} value={sortOrder} onChange={(event) => onSortOrder(event.target.value)}>
          <option value="asc">По возрастанию</option>
          <option value="desc">По убыванию</option>
        </select>
      </Field>
    </>
  );
}

function StatusBadge({ status }) {
  const cancelled = status === "cancelled";
  return (
    <span
      className={
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold " +
        (cancelled ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800")
      }
    >
      {cancelled ? "Отменено" : status === "confirmed" ? "Подтверждено" : status}
    </span>
  );
}

function HotelsSection({ detailId, navigate, notify }) {
  if (detailId) {
    return <HotelDetail hotelId={detailId} navigate={navigate} notify={notify} />;
  }
  return <HotelList navigate={navigate} notify={notify} />;
}

function HotelList({ navigate, notify }) {
  const initialDates = useMemo(() => defaultStayDates(), []);
  const [filters, setFilters] = useState(initialDates);
  const [appliedFilters, setAppliedFilters] = useState(initialDates);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");
  const [result, setResult] = useState({ items: [], total: 0, page: 1, per_page: 10 });
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyHotelForm);
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const payload = await api.hotels.list({
        ...appliedFilters,
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setResult(normalisePage(payload, page, perPage));
      setState("ready");
    } catch (requestError) {
      setError(requestError);
      setState("error");
    }
  }, [appliedFilters, page, perPage, sortBy, sortOrder]);

  useDeferredLoad(load);

  const submitFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const createHotel = async (event) => {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const hotel = await api.hotels.create(createForm);
      setCreateForm(emptyHotelForm);
      setCreateOpen(false);
      announce(notify, "Отель создан.");
      await load();
      if (hotel?.id) navigate("/admin/hotels/" + hotel.id);
    } catch (requestError) {
      setCreateError(requestError);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeading
        title="Отели"
        detail="Каталог отелей. Период применяется сервером и показывает объекты с доступными номерами."
        actions={
          <button className={primaryButtonClass} type="button" onClick={() => setCreateOpen((value) => !value)}>
            {createOpen ? <XMarkIcon className={iconClass} aria-hidden="true" /> : <PlusIcon className={iconClass} aria-hidden="true" />}
            {createOpen ? "Закрыть форму" : "Добавить отель"}
          </button>
        }
      />

      {createOpen && (
        <form className={panelClass + " grid gap-4 p-5"} onSubmit={createHotel}>
          <div>
            <h2 className="m-0 text-lg font-bold text-stone-950">Новый отель</h2>
            <p className="mb-0 mt-1 text-sm text-stone-600">Создайте базовую карточку, затем добавьте номера и изображения.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Название">
              <input
                className={inputClass}
                required
                maxLength={100}
                value={createForm.title}
                onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })}
              />
            </Field>
            <Field label="Адрес">
              <input
                className={inputClass}
                required
                maxLength={500}
                value={createForm.location}
                onChange={(event) => setCreateForm({ ...createForm, location: event.target.value })}
              />
            </Field>
          </div>
          <ActionError error={createError} />
          <div>
            <button className={primaryButtonClass} type="submit" disabled={creating}>
              {creating ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <PlusIcon className={iconClass} aria-hidden="true" />}
              Создать
            </button>
          </div>
        </form>
      )}

      <form className={panelClass + " grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]"} onSubmit={submitFilters}>
        <Field label="Заезд">
          <input
            className={inputClass}
            type="date"
            required
            value={filters.date_from}
            onChange={(event) => setFilters({ ...filters, date_from: event.target.value })}
          />
        </Field>
        <Field label="Выезд">
          <input
            className={inputClass}
            type="date"
            required
            min={filters.date_from}
            value={filters.date_to}
            onChange={(event) => setFilters({ ...filters, date_to: event.target.value })}
          />
        </Field>
        <SortFields
          sortBy={sortBy}
          sortOrder={sortOrder}
          options={hotelSortOptions}
          onSortBy={(value) => {
            setPage(1);
            setSortBy(value);
          }}
          onSortOrder={(value) => {
            setPage(1);
            setSortOrder(value);
          }}
        />
        <button className={primaryButtonClass + " self-end"} type="submit">
          <ArrowPathIcon className={iconClass} aria-hidden="true" />
          Применить
        </button>
      </form>

      {state === "loading" && <LoadingState label="Загружаем отели…" />}
      {state === "error" && <ErrorState error={error} onRetry={load} />}
      {state === "ready" && result.items.length === 0 && (
        <EmptyState
          title="Отелей не найдено"
          detail="На выбранный период нет доступных объектов либо каталог пока пуст."
          action={
            <button className={primaryButtonClass} type="button" onClick={() => setCreateOpen(true)}>
              <PlusIcon className={iconClass} aria-hidden="true" />
              Добавить отель
            </button>
          }
        />
      )}
      {state === "ready" && result.items.length > 0 && (
        <section className={panelClass + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-bold">ID</th>
                  <th className="px-5 py-3 font-bold">Название</th>
                  <th className="px-5 py-3 font-bold">Адрес</th>
                  <th className="px-5 py-3 text-right font-bold">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {result.items.map((hotel) => (
                  <tr className="hover:bg-stone-50" key={hotel.id}>
                    <td className="px-5 py-4 font-mono text-xs text-stone-500">#{hotel.id}</td>
                    <td className="px-5 py-4 font-bold text-stone-950">{hotel.title}</td>
                    <td className="max-w-lg px-5 py-4 text-stone-600">{hotel.location}</td>
                    <td className="px-5 py-4 text-right">
                      <button className={secondaryButtonClass} type="button" onClick={() => navigate("/admin/hotels/" + hotel.id)}>
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Управлять
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <Pagination
              page={page}
              perPage={perPage}
              total={result.total}
              onPageChange={setPage}
              onPerPageChange={(value) => {
                setPage(1);
                setPerPage(value);
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function HotelDetail({ hotelId, navigate, notify }) {
  const [hotel, setHotel] = useState(null);
  const [form, setForm] = useState(emptyHotelForm);
  const [patchForm, setPatchForm] = useState(emptyHotelForm);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const payload = await api.hotels.get(hotelId);
      setHotel(payload);
      setForm({ title: payload.title ?? "", location: payload.location ?? "" });
      setState("ready");
    } catch (requestError) {
      setError(requestError);
      setState("error");
    }
  }, [hotelId]);

  useDeferredLoad(load);

  const replaceHotel = async (event) => {
    event.preventDefault();
    setBusyAction("replace");
    setActionError(null);
    try {
      await api.hotels.replace(hotelId, form);
      announce(notify, "Данные отеля полностью обновлены.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const updateHotel = async (event) => {
    event.preventDefault();
    const payload = {};
    if (patchForm.title !== "") payload.title = patchForm.title;
    if (patchForm.location !== "") payload.location = patchForm.location;
    setBusyAction("update");
    setActionError(null);
    try {
      await api.hotels.update(hotelId, payload);
      setPatchForm(emptyHotelForm);
      announce(notify, "Частичное изменение сохранено.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const removeHotel = async () => {
    if (!window.confirm("Удалить отель? Сервер отклонит удаление, если нарушается целостность данных.")) return;
    setBusyAction("remove");
    setActionError(null);
    try {
      await api.hotels.remove(hotelId);
      announce(notify, "Отель удалён.");
      navigate("/admin/hotels");
    } catch (requestError) {
      setActionError(requestError);
      setBusyAction("");
    }
  };

  if (state === "loading") return <LoadingState label="Загружаем отель…" />;
  if (state === "error") return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="grid gap-6">
      <PageHeading
        title={hotel.title}
        detail={hotel.location}
        onBack={() => navigate("/admin/hotels")}
        actions={
          <>
            <button className={secondaryButtonClass} type="button" onClick={() => navigate("/admin/hotels/" + hotelId + "/rooms")}>
              <HomeModernIcon className={iconClass} aria-hidden="true" />
              Номера
            </button>
            <button className={secondaryButtonClass} type="button" onClick={() => navigate("/admin/hotels/" + hotelId + "/images")}>
              <PhotoIcon className={iconClass} aria-hidden="true" />
              Изображения
            </button>
          </>
        }
      />

      <ActionError error={actionError} />

      <div className="grid gap-5 xl:grid-cols-2">
        <form className={panelClass + " grid content-start gap-4 p-5"} onSubmit={replaceHotel}>
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-orange-700">PUT</p>
            <h2 className="mb-0 mt-1 text-xl font-bold text-stone-950">Полное редактирование</h2>
            <p className="mb-0 mt-1 text-sm leading-6 text-stone-600">Все обязательные поля будут отправлены целиком.</p>
          </div>
          <Field label="Название">
            <input
              className={inputClass}
              required
              maxLength={100}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          <Field label="Адрес">
            <textarea
              className={textareaClass}
              required
              maxLength={500}
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </Field>
          <button className={primaryButtonClass + " justify-self-start"} type="submit" disabled={Boolean(busyAction)}>
            {busyAction === "replace" ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <PencilSquareIcon className={iconClass} aria-hidden="true" />}
            Сохранить полностью
          </button>
        </form>

        <form className={panelClass + " grid content-start gap-4 p-5"} onSubmit={updateHotel}>
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-orange-700">PATCH</p>
            <h2 className="mb-0 mt-1 text-xl font-bold text-stone-950">Частичное редактирование</h2>
            <p className="mb-0 mt-1 text-sm leading-6 text-stone-600">Заполните только поля, которые нужно изменить.</p>
          </div>
          <Field label="Новое название">
            <input
              className={inputClass}
              maxLength={100}
              placeholder={hotel.title}
              value={patchForm.title}
              onChange={(event) => setPatchForm({ ...patchForm, title: event.target.value })}
            />
          </Field>
          <Field label="Новый адрес">
            <textarea
              className={textareaClass}
              maxLength={500}
              placeholder={hotel.location}
              value={patchForm.location}
              onChange={(event) => setPatchForm({ ...patchForm, location: event.target.value })}
            />
          </Field>
          <button className={secondaryButtonClass + " justify-self-start"} type="submit" disabled={Boolean(busyAction)}>
            {busyAction === "update" ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <PencilSquareIcon className={iconClass} aria-hidden="true" />}
            Сохранить выбранное
          </button>
        </form>
      </div>

      <section className={panelClass + " flex flex-col gap-4 border-red-200 p-5 sm:flex-row sm:items-center sm:justify-between"}>
        <div>
          <h2 className="m-0 text-lg font-bold text-stone-950">Удаление отеля</h2>
          <p className="mb-0 mt-1 text-sm leading-6 text-stone-600">Конфликты со связанными бронированиями проверяет backend.</p>
        </div>
        <button className={dangerButtonClass} type="button" disabled={Boolean(busyAction)} onClick={removeHotel}>
          {busyAction === "remove" ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <TrashIcon className={iconClass} aria-hidden="true" />}
          Удалить отель
        </button>
      </section>
    </div>
  );
}

function HotelIdRequired({ section, navigate }) {
  const [hotelId, setHotelId] = useState("");
  const destination = section === "images" ? "images" : "rooms";
  return (
    <div className="grid gap-6">
      <PageHeading
        title={section === "images" ? "Изображения отеля" : "Номера отеля"}
        detail="Для управления выберите отель из каталога или укажите его ID."
        onBack={() => navigate("/admin/hotels")}
      />
      <form
        className={panelClass + " mx-auto grid w-full max-w-lg gap-4 p-5"}
        onSubmit={(event) => {
          event.preventDefault();
          navigate("/admin/hotels/" + hotelId + "/" + destination);
        }}
      >
        <Field label="ID отеля">
          <input
            className={inputClass}
            type="number"
            min={1}
            required
            value={hotelId}
            onChange={(event) => setHotelId(event.target.value)}
          />
        </Field>
        <button className={primaryButtonClass} type="submit">
          Открыть
        </button>
      </form>
    </div>
  );
}

function RoomsSection({ hotelId, navigate, notify }) {
  if (!hotelId) return <HotelIdRequired section="rooms" navigate={navigate} />;
  return <RoomsManager hotelId={hotelId} navigate={navigate} notify={notify} />;
}

function RoomForm({ initial = emptyRoomForm, facilities, submitLabel, busy, error, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    title: initial.title ?? "",
    description: initial.description ?? "",
    price: String(initial.price ?? ""),
    quantity: String(initial.quantity ?? ""),
    facilities_ids: Array.isArray(initial.facilities_ids)
      ? initial.facilities_ids
      : (initial.facilities ?? []).map((facility) => facility.id),
  }));

  const toggleFacility = (facilityId) => {
    setForm((current) => ({
      ...current,
      facilities_ids: current.facilities_ids.includes(facilityId)
        ? current.facilities_ids.filter((id) => id !== facilityId)
        : [...current.facilities_ids, facilityId],
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      title: form.title,
      description: form.description === "" ? null : form.description,
      price: Number(form.price),
      quantity: Number(form.quantity),
      facilities_ids: form.facilities_ids,
    });
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Название">
          <input
            className={inputClass}
            required
            maxLength={200}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </Field>
        <Field label="Цена за ночь">
          <input
            className={inputClass}
            type="number"
            min={0}
            required
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
          />
        </Field>
        <Field label="Количество">
          <input
            className={inputClass}
            type="number"
            min={1}
            required
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Описание">
            <textarea
              className={textareaClass}
              maxLength={2000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
        </div>
      </div>
      <fieldset className="rounded-xl border border-stone-200 p-4">
        <legend className="px-1 text-sm font-bold text-stone-900">Удобства</legend>
        {facilities.length === 0 ? (
          <p className="m-0 text-sm text-stone-500">Сначала создайте удобства в соответствующем разделе.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility) => (
              <label className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-stone-700 hover:bg-stone-50" key={facility.id}>
                <input
                  className="h-4 w-4 accent-emerald-800"
                  type="checkbox"
                  checked={form.facilities_ids.includes(facility.id)}
                  onChange={() => toggleFacility(facility.id)}
                />
                {facility.title}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <ActionError error={error} />
      <div className="flex flex-wrap gap-2">
        <button className={primaryButtonClass} type="submit" disabled={busy}>
          {busy ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <PencilSquareIcon className={iconClass} aria-hidden="true" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button className={secondaryButtonClass} type="button" disabled={busy} onClick={onCancel}>
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

function RoomPatchForm({ room, facilities, busy, error, onSubmit }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    quantity: "",
    includeFacilities: false,
    facilities_ids: (room.facilities ?? []).map((facility) => facility.id),
  });

  const toggleFacility = (facilityId) => {
    setForm((current) => ({
      ...current,
      facilities_ids: current.facilities_ids.includes(facilityId)
        ? current.facilities_ids.filter((id) => id !== facilityId)
        : [...current.facilities_ids, facilityId],
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const payload = {};
    if (form.title !== "") payload.title = form.title;
    if (form.description !== "") payload.description = form.description;
    if (form.price !== "") payload.price = Number(form.price);
    if (form.quantity !== "") payload.quantity = Number(form.quantity);
    if (form.includeFacilities) payload.facilities_ids = form.facilities_ids;
    onSubmit(payload, () =>
      setForm({
        title: "",
        description: "",
        price: "",
        quantity: "",
        includeFacilities: false,
        facilities_ids: (room.facilities ?? []).map((facility) => facility.id),
      }),
    );
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Новое название">
          <input className={inputClass} maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </Field>
        <Field label="Новая цена">
          <input className={inputClass} type="number" min={0} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
        </Field>
        <Field label="Новое количество">
          <input className={inputClass} type="number" min={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Новое описание">
            <textarea className={textareaClass} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
        <input
          className="h-4 w-4 accent-emerald-800"
          type="checkbox"
          checked={form.includeFacilities}
          onChange={(event) => setForm({ ...form, includeFacilities: event.target.checked })}
        />
        Также заменить набор удобств
      </label>
      {form.includeFacilities && (
        <div className="grid gap-2 rounded-xl border border-stone-200 p-3 sm:grid-cols-2">
          {facilities.map((facility) => (
            <label className="flex min-h-9 items-center gap-2 text-sm text-stone-700" key={facility.id}>
              <input
                className="h-4 w-4 accent-emerald-800"
                type="checkbox"
                checked={form.facilities_ids.includes(facility.id)}
                onChange={() => toggleFacility(facility.id)}
              />
              {facility.title}
            </label>
          ))}
        </div>
      )}
      <ActionError error={error} />
      <button className={secondaryButtonClass + " justify-self-start"} type="submit" disabled={busy}>
        {busy ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <PencilSquareIcon className={iconClass} aria-hidden="true" />}
        Сохранить выбранное
      </button>
    </form>
  );
}

function RoomsManager({ hotelId, navigate, notify }) {
  const initialDates = useMemo(() => defaultStayDates(), []);
  const [hotel, setHotel] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [dates, setDates] = useState(initialDates);
  const [appliedDates, setAppliedDates] = useState(initialDates);
  const [rooms, setRooms] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedState, setSelectedState] = useState("idle");
  const [actionError, setActionError] = useState(null);
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [hotelPayload, facilitiesPayload, roomsPayload] = await Promise.all([
        api.hotels.get(hotelId),
        api.facilities.list(),
        api.rooms.list(hotelId, appliedDates),
      ]);
      setHotel(hotelPayload);
      setFacilities(Array.isArray(facilitiesPayload) ? facilitiesPayload : []);
      setRooms(Array.isArray(roomsPayload) ? roomsPayload : []);
      setState("ready");
    } catch (requestError) {
      setError(requestError);
      setState("error");
    }
  }, [appliedDates, hotelId]);

  useDeferredLoad(load);

  const createRoom = async (payload) => {
    setBusyAction("create");
    setActionError(null);
    try {
      await api.rooms.create(hotelId, payload);
      setCreateOpen(false);
      announce(notify, "Номер создан.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const openRoom = async (roomId) => {
    setSelectedState("loading");
    setSelectedRoom(null);
    setActionError(null);
    try {
      const payload = await api.rooms.get(hotelId, roomId);
      setSelectedRoom(payload);
      setSelectedState("ready");
    } catch (requestError) {
      setActionError(requestError);
      setSelectedState("error");
    }
  };

  const replaceRoom = async (payload) => {
    setBusyAction("replace");
    setActionError(null);
    try {
      await api.rooms.replace(hotelId, selectedRoom.id, payload);
      announce(notify, "Номер полностью обновлён.");
      const refreshed = await api.rooms.get(hotelId, selectedRoom.id);
      setSelectedRoom(refreshed);
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const updateRoom = async (payload, reset) => {
    setBusyAction("update");
    setActionError(null);
    try {
      await api.rooms.update(hotelId, selectedRoom.id, payload);
      announce(notify, "Частичное изменение номера сохранено.");
      const refreshed = await api.rooms.get(hotelId, selectedRoom.id);
      setSelectedRoom(refreshed);
      reset();
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const removeRoom = async (roomId) => {
    if (!window.confirm("Удалить номер? Возможный конфликт связанных броней проверит backend.")) return;
    setBusyAction("remove-" + roomId);
    setActionError(null);
    try {
      await api.rooms.remove(hotelId, roomId);
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
        setSelectedState("idle");
      }
      announce(notify, "Номер удалён.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  if (state === "loading") return <LoadingState label="Загружаем номера…" />;
  if (state === "error") return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="grid gap-6">
      <PageHeading
        title={"Номера · " + hotel.title}
        detail={hotel.location}
        onBack={() => navigate("/admin/hotels/" + hotelId)}
        actions={
          <button
            className={primaryButtonClass}
            type="button"
            onClick={() => {
              setCreateOpen((value) => !value);
              setActionError(null);
            }}
          >
            {createOpen ? <XMarkIcon className={iconClass} aria-hidden="true" /> : <PlusIcon className={iconClass} aria-hidden="true" />}
            {createOpen ? "Закрыть" : "Добавить номер"}
          </button>
        }
      />

      {createOpen && (
        <section className={panelClass + " p-5"}>
          <h2 className="mb-4 mt-0 text-xl font-bold text-stone-950">Новый номер</h2>
          <RoomForm
            facilities={facilities}
            submitLabel="Создать номер"
            busy={busyAction === "create"}
            error={actionError}
            onSubmit={createRoom}
            onCancel={() => {
              setCreateOpen(false);
              setActionError(null);
            }}
          />
        </section>
      )}

      <form
        className={panelClass + " grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto]"}
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedDates(dates);
        }}
      >
        <Field label="Заезд">
          <input className={inputClass} type="date" required value={dates.date_from} onChange={(event) => setDates({ ...dates, date_from: event.target.value })} />
        </Field>
        <Field label="Выезд">
          <input className={inputClass} type="date" required min={dates.date_from} value={dates.date_to} onChange={(event) => setDates({ ...dates, date_to: event.target.value })} />
        </Field>
        <button className={primaryButtonClass + " self-end"} type="submit">
          Показать доступные
        </button>
      </form>

      <ActionError error={selectedState === "error" ? actionError : null} />

      {rooms.length === 0 ? (
        <EmptyState
          icon={HomeModernIcon}
          title="Доступных номеров нет"
          detail="Backend не вернул ни одного номера на выбранный период. Демонстрационные данные не подставляются."
        />
      ) : (
        <section className={panelClass + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-bold">ID</th>
                  <th className="px-5 py-3 font-bold">Номер</th>
                  <th className="px-5 py-3 font-bold">Цена</th>
                  <th className="px-5 py-3 font-bold">Количество</th>
                  <th className="px-5 py-3 font-bold">Удобства</th>
                  <th className="px-5 py-3 text-right font-bold">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {rooms.map((room) => (
                  <tr className="align-top hover:bg-stone-50" key={room.id}>
                    <td className="px-5 py-4 font-mono text-xs text-stone-500">#{room.id}</td>
                    <td className="px-5 py-4">
                      <strong className="block text-stone-950">{room.title}</strong>
                      {room.description && <span className="mt-1 block max-w-md text-xs leading-5 text-stone-500">{room.description}</span>}
                    </td>
                    <td className="px-5 py-4 font-semibold text-stone-900">{formatMoney(room.price)}</td>
                    <td className="px-5 py-4 text-stone-700">{room.quantity}</td>
                    <td className="max-w-xs px-5 py-4 text-xs leading-5 text-stone-600">
                      {(room.facilities ?? []).map((facility) => facility.title).join(" · ") || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button className={secondaryButtonClass} type="button" onClick={() => openRoom(room.id)}>
                          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                          Изменить
                        </button>
                        <button className={dangerButtonClass + " px-2.5"} type="button" aria-label={"Удалить номер " + room.title} disabled={busyAction === "remove-" + room.id} onClick={() => removeRoom(room.id)}>
                          {busyAction === "remove-" + room.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <TrashIcon className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedState === "loading" && <LoadingState label="Загружаем номер…" />}
      {selectedState === "ready" && selectedRoom && (
        <section className={panelClass + " grid gap-6 p-5"}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-orange-700">Номер #{selectedRoom.id}</p>
              <h2 className="mb-0 mt-1 text-2xl font-bold text-stone-950">{selectedRoom.title}</h2>
            </div>
            <button
              className="grid h-10 w-10 place-items-center rounded-full border-0 bg-stone-100 text-stone-700 hover:bg-stone-200"
              type="button"
              aria-label="Закрыть редактор"
              onClick={() => {
                setSelectedRoom(null);
                setSelectedState("idle");
                setActionError(null);
              }}
            >
              <XMarkIcon className={iconClass} aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="grid content-start gap-3">
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-orange-700">PUT</p>
                <h3 className="mb-4 mt-1 text-lg font-bold text-stone-950">Полная замена</h3>
              </div>
              <RoomForm
                key={"replace-" + JSON.stringify(selectedRoom)}
                initial={selectedRoom}
                facilities={facilities}
                submitLabel="Сохранить полностью"
                busy={busyAction === "replace"}
                error={busyAction !== "update" ? actionError : null}
                onSubmit={replaceRoom}
              />
            </div>
            <div className="grid content-start gap-3 border-t border-stone-200 pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-orange-700">PATCH</p>
                <h3 className="mb-1 mt-1 text-lg font-bold text-stone-950">Частичное изменение</h3>
                <p className="mb-4 mt-0 text-sm leading-6 text-stone-600">Пустые поля не отправляются. Отметьте удобства, только если их набор нужно заменить.</p>
              </div>
              <RoomPatchForm
                key={"patch-" + JSON.stringify(selectedRoom)}
                room={selectedRoom}
                facilities={facilities}
                busy={busyAction === "update"}
                error={busyAction !== "replace" ? actionError : null}
                onSubmit={updateRoom}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function FacilitiesSection({ notify }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState({});
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const payload = await api.facilities.list();
      const facilities = Array.isArray(payload) ? payload : [];
      setItems(facilities);
      setEditing(Object.fromEntries(facilities.map((facility) => [facility.id, facility.title])));
      setState("ready");
    } catch (requestError) {
      setError(requestError);
      setState("error");
    }
  }, []);

  useDeferredLoad(load);

  const createFacility = async (event) => {
    event.preventDefault();
    setBusyAction("create");
    setActionError(null);
    try {
      await api.facilities.create({ title: newTitle });
      setNewTitle("");
      announce(notify, "Удобство создано.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const replaceFacility = async (facilityId) => {
    setBusyAction("replace-" + facilityId);
    setActionError(null);
    try {
      await api.facilities.replace(facilityId, { title: editing[facilityId] });
      announce(notify, "Удобство обновлено.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const removeFacility = async (facility) => {
    if (!window.confirm("Удалить удобство «" + facility.title + "»?")) return;
    setBusyAction("remove-" + facility.id);
    setActionError(null);
    try {
      await api.facilities.remove(facility.id);
      announce(notify, "Удобство удалено.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeading title="Удобства" detail="Единый справочник удобств, доступных при создании и редактировании номеров." />

      <form className={panelClass + " grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end"} onSubmit={createFacility}>
        <Field label="Новое удобство">
          <input className={inputClass} required maxLength={100} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
        </Field>
        <button className={primaryButtonClass} type="submit" disabled={busyAction === "create"}>
          {busyAction === "create" ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <PlusIcon className={iconClass} aria-hidden="true" />}
          Добавить
        </button>
      </form>

      <ActionError error={actionError} />
      {state === "loading" && <LoadingState label="Загружаем удобства…" />}
      {state === "error" && <ErrorState error={error} onRetry={load} />}
      {state === "ready" && items.length === 0 && <EmptyState icon={WrenchScrewdriverIcon} title="Справочник пуст" detail="Добавьте первое удобство с помощью формы выше." />}
      {state === "ready" && items.length > 0 && (
        <section className={panelClass + " divide-y divide-stone-200 overflow-hidden"}>
          {items.map((facility) => (
            <div className="grid gap-3 p-4 sm:grid-cols-[70px_minmax(0,1fr)_auto] sm:items-center" key={facility.id}>
              <span className="font-mono text-xs text-stone-500">#{facility.id}</span>
              <input
                className={inputClass}
                required
                maxLength={100}
                aria-label={"Название удобства " + facility.id}
                value={editing[facility.id] ?? ""}
                onChange={(event) => setEditing({ ...editing, [facility.id]: event.target.value })}
              />
              <div className="flex gap-2">
                <button className={secondaryButtonClass} type="button" disabled={Boolean(busyAction)} onClick={() => replaceFacility(facility.id)}>
                  {busyAction === "replace-" + facility.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />}
                  Сохранить
                </button>
                <button className={dangerButtonClass + " px-2.5"} type="button" aria-label={"Удалить " + facility.title} disabled={Boolean(busyAction)} onClick={() => removeFacility(facility)}>
                  {busyAction === "remove-" + facility.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <TrashIcon className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ImagesSection({ hotelId, navigate, notify }) {
  if (!hotelId) return <HotelIdRequired section="images" navigate={navigate} />;
  return <ImagesManager hotelId={hotelId} navigate={navigate} notify={notify} />;
}

function ImagesManager({ hotelId, navigate, notify }) {
  const [hotel, setHotel] = useState(null);
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [replacementFiles, setReplacementFiles] = useState({});
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [hotelPayload, imagePayload] = await Promise.all([api.hotels.get(hotelId), api.images.list(hotelId)]);
      setHotel(hotelPayload);
      setItems(Array.isArray(imagePayload) ? imagePayload : []);
      setState("ready");
    } catch (requestError) {
      setError(requestError);
      setState("error");
    }
  }, [hotelId]);

  useDeferredLoad(load);

  const upload = async (event) => {
    event.preventDefault();
    setBusyAction("upload");
    setActionError(null);
    try {
      await api.images.create(hotelId, uploadFile);
      setUploadFile(null);
      setFileInputKey((value) => value + 1);
      announce(notify, "Изображение загружено.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const replace = async (event, imageId) => {
    event.preventDefault();
    setBusyAction("replace-" + imageId);
    setActionError(null);
    try {
      await api.images.replace(hotelId, imageId, replacementFiles[imageId]);
      setReplacementFiles((current) => ({ ...current, [imageId]: null }));
      announce(notify, "Оригинал изображения заменён.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  const remove = async (imageId) => {
    if (!window.confirm("Удалить изображение?")) return;
    setBusyAction("remove-" + imageId);
    setActionError(null);
    try {
      await api.images.remove(hotelId, imageId);
      announce(notify, "Изображение удалено.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setBusyAction("");
    }
  };

  if (state === "loading") return <LoadingState label="Загружаем изображения…" />;
  if (state === "error") return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="grid gap-6">
      <PageHeading
        title={"Изображения · " + hotel.title}
        detail="Backend проверяет размер, MIME и фактическое содержимое файла."
        onBack={() => navigate("/admin/hotels/" + hotelId)}
      />

      <form className={panelClass + " grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end"} onSubmit={upload}>
        <Field label="Новый оригинал" hint="JPEG, PNG или WebP. Ограничения окончательно проверяет сервер.">
          <input
            key={fileInputKey}
            className={inputClass + " py-2"}
            type="file"
            required
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <button className={primaryButtonClass} type="submit" disabled={busyAction === "upload" || !uploadFile}>
          {busyAction === "upload" ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <ArrowUpTrayIcon className={iconClass} aria-hidden="true" />}
          Загрузить
        </button>
      </form>

      <ActionError error={actionError} />

      {items.length === 0 ? (
        <EmptyState icon={PhotoIcon} title="Изображений пока нет" detail="Загрузите первый проверенный оригинал с помощью формы выше." />
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article className={panelClass + " overflow-hidden"} key={item.id}>
              <div className="aspect-[4/3] bg-stone-100">
                <img className="h-full w-full object-cover" src={item.original_url} alt={"Изображение отеля " + hotel.title} loading="lazy" />
              </div>
              <div className="grid gap-4 p-4">
                <div>
                  <p className="m-0 break-all font-mono text-[11px] text-stone-500">{item.id}</p>
                  <p className="mb-0 mt-1 text-xs text-stone-500">Добавлено {formatDateTime(item.created_at)}</p>
                </div>
                <form className="grid gap-2" onSubmit={(event) => replace(event, item.id)}>
                  <input
                    className={inputClass + " py-2 text-xs"}
                    type="file"
                    required
                    aria-label={"Новый файл для изображения " + item.id}
                    onChange={(event) => setReplacementFiles({ ...replacementFiles, [item.id]: event.target.files?.[0] ?? null })}
                  />
                  <button className={secondaryButtonClass} type="submit" disabled={busyAction === "replace-" + item.id || !replacementFiles[item.id]}>
                    {busyAction === "replace-" + item.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />}
                    Заменить оригинал
                  </button>
                </form>
                <button className={dangerButtonClass} type="button" disabled={busyAction === "remove-" + item.id} onClick={() => remove(item.id)}>
                  {busyAction === "remove-" + item.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <TrashIcon className="h-4 w-4" aria-hidden="true" />}
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function BookingsSection({ detailId, navigate, notify }) {
  if (detailId) return <BookingDetail bookingId={detailId} navigate={navigate} notify={notify} />;
  return <BookingsList navigate={navigate} notify={notify} />;
}

function BookingsList({ navigate, notify }) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");
  const [result, setResult] = useState({ items: [], total: 0, page: 1, per_page: 10 });
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const payload = await api.bookings.list({
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setResult(normalisePage(payload, page, perPage));
      setState("ready");
    } catch (requestError) {
      setError(requestError);
      setState("error");
    }
  }, [page, perPage, sortBy, sortOrder]);

  useDeferredLoad(load);

  const cancel = async (bookingId) => {
    if (!window.confirm("Отправить запрос на отмену бронирования #" + bookingId + "?")) return;
    setCancellingId(bookingId);
    setActionError(null);
    try {
      await api.bookings.cancel(bookingId);
      announce(notify, "Статус бронирования обновлён.");
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeading title="Все бронирования" detail="Пагинированный административный список. Право и допустимость отмены проверяет backend." />
      <section className={panelClass + " grid gap-4 p-4 sm:grid-cols-2 lg:max-w-2xl"}>
        <SortFields
          sortBy={sortBy}
          sortOrder={sortOrder}
          options={bookingSortOptions}
          onSortBy={(value) => {
            setPage(1);
            setSortBy(value);
          }}
          onSortOrder={(value) => {
            setPage(1);
            setSortOrder(value);
          }}
        />
      </section>
      <ActionError error={actionError} />
      {state === "loading" && <LoadingState label="Загружаем бронирования…" />}
      {state === "error" && <ErrorState error={error} onRetry={load} />}
      {state === "ready" && result.items.length === 0 && <EmptyState icon={CalendarDaysIcon} title="Бронирований нет" detail="Список пока пуст." />}
      {state === "ready" && result.items.length > 0 && (
        <section className={panelClass + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-bold">ID</th>
                  <th className="px-4 py-3 font-bold">Пользователь</th>
                  <th className="px-4 py-3 font-bold">Номер</th>
                  <th className="px-4 py-3 font-bold">Период</th>
                  <th className="px-4 py-3 font-bold">Стоимость</th>
                  <th className="px-4 py-3 font-bold">Статус</th>
                  <th className="px-4 py-3 text-right font-bold">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {result.items.map((booking) => (
                  <tr className="hover:bg-stone-50" key={booking.id}>
                    <td className="px-4 py-4 font-mono text-xs text-stone-500">#{booking.id}</td>
                    <td className="px-4 py-4 text-stone-700">#{booking.user_id}</td>
                    <td className="px-4 py-4 text-stone-700">#{booking.room_id}</td>
                    <td className="px-4 py-4 text-stone-700">{formatDate(booking.date_from)} — {formatDate(booking.date_to)}</td>
                    <td className="px-4 py-4">
                      <strong className="block text-stone-950">{formatMoney(booking.total_cost)}</strong>
                      <span className="text-xs text-stone-500">{formatMoney(booking.price)} / ночь</span>
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={booking.status} /></td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button className={secondaryButtonClass} type="button" onClick={() => navigate("/admin/bookings/" + booking.id)}>
                          Открыть
                        </button>
                        <button className={dangerButtonClass} type="button" disabled={cancellingId === booking.id} onClick={() => cancel(booking.id)}>
                          {cancellingId === booking.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <XMarkIcon className="h-4 w-4" aria-hidden="true" />}
                          Отменить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <Pagination
              page={page}
              perPage={perPage}
              total={result.total}
              onPageChange={setPage}
              onPerPageChange={(value) => {
                setPage(1);
                setPerPage(value);
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function BookingDetail({ bookingId, navigate, notify }) {
  const [booking, setBooking] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const payload = await api.bookings.get(bookingId);
      setBooking(payload);
      setState("ready");
    } catch (requestError) {
      setError(requestError);
      setState("error");
    }
  }, [bookingId]);

  useDeferredLoad(load);

  const cancel = async () => {
    if (!window.confirm("Отправить запрос на отмену бронирования #" + bookingId + "?")) return;
    setCancelling(true);
    setActionError(null);
    try {
      const payload = await api.bookings.cancel(bookingId);
      setBooking(payload);
      announce(notify, "Статус бронирования обновлён.");
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setCancelling(false);
    }
  };

  if (state === "loading") return <LoadingState label="Загружаем бронирование…" />;
  if (state === "error") return <ErrorState error={error} onRetry={load} />;

  const facts = [
    ["Пользователь", "#" + booking.user_id],
    ["Номер", "#" + booking.room_id],
    ["Заезд", formatDate(booking.date_from)],
    ["Выезд", formatDate(booking.date_to)],
    ["Цена за ночь", formatMoney(booking.price)],
    ["Общая стоимость", formatMoney(booking.total_cost)],
    ["Создано", formatDateTime(booking.created_at)],
    ["Отменено", formatDateTime(booking.cancelled_at)],
  ];

  return (
    <div className="grid gap-6">
      <PageHeading
        title={"Бронирование #" + booking.id}
        detail="Подробный серверный контракт бронирования."
        onBack={() => navigate("/admin/bookings")}
        actions={
          <button className={dangerButtonClass} type="button" disabled={cancelling} onClick={cancel}>
            {cancelling ? <ArrowPathIcon className={iconClass + " animate-spin"} aria-hidden="true" /> : <XMarkIcon className={iconClass} aria-hidden="true" />}
            Отправить отмену
          </button>
        }
      />
      <ActionError error={actionError} />
      <section className={panelClass + " overflow-hidden"}>
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 p-5">
          <h2 className="m-0 text-lg font-bold text-stone-950">Состояние</h2>
          <StatusBadge status={booking.status} />
        </div>
        <dl className="grid sm:grid-cols-2 xl:grid-cols-4">
          {facts.map(([label, value]) => (
            <div className="border-b border-stone-200 p-5 sm:border-r" key={label}>
              <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</dt>
              <dd className="mb-0 ml-0 mt-2 text-sm font-semibold text-stone-950">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function AnalyticsSection({ navigate }) {
  const [draftPeriod, setDraftPeriod] = useState({ date_from: "", date_to: "" });
  const [period, setPeriod] = useState({ date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("hotel_id");
  const [sortOrder, setSortOrder] = useState("asc");
  const [result, setResult] = useState({ items: [], total: 0, page: 1, per_page: 10 });
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      if (!api.analytics?.list) {
        setState("unavailable");
        return;
      }
      const params = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (period.date_from !== "") params.date_from = period.date_from;
      if (period.date_to !== "") params.date_to = period.date_to;
      const payload = await api.analytics.list(params);
      setResult(normalisePage(payload, page, perPage));
      setState("ready");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setState("unavailable");
      } else {
        setError(requestError);
        setState("error");
      }
    }
  }, [page, perPage, period, sortBy, sortOrder]);

  useDeferredLoad(load);

  const applyPeriod = (event) => {
    event.preventDefault();
    setPage(1);
    setPeriod(draftPeriod);
  };

  return (
    <div className="grid gap-6">
      <PageHeading title="Аналитика по отелям" detail="Метрики вычисляются backend из текущих таблиц. Без периода отображается вся история." />
      <form className={panelClass + " grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]"} onSubmit={applyPeriod}>
        <Field label="Начало периода">
          <input className={inputClass} type="date" value={draftPeriod.date_from} onChange={(event) => setDraftPeriod({ ...draftPeriod, date_from: event.target.value })} />
        </Field>
        <Field label="Конец периода">
          <input className={inputClass} type="date" value={draftPeriod.date_to} onChange={(event) => setDraftPeriod({ ...draftPeriod, date_to: event.target.value })} />
        </Field>
        <SortFields
          sortBy={sortBy}
          sortOrder={sortOrder}
          options={analyticsSortOptions}
          onSortBy={(value) => {
            setPage(1);
            setSortBy(value);
          }}
          onSortOrder={(value) => {
            setPage(1);
            setSortOrder(value);
          }}
        />
        <button className={primaryButtonClass + " self-end"} type="submit">
          <ChartBarSquareIcon className={iconClass} aria-hidden="true" />
          Построить
        </button>
      </form>

      {state === "loading" && <LoadingState label="Строим отчёт…" />}
      {state === "unavailable" && (
        <EmptyState
          icon={ChartBarSquareIcon}
          title="Аналитика недоступна"
          detail="Backend вернул 404 либо namespace аналитики отсутствует. Интерфейс не подставляет демонстрационные показатели."
        />
      )}
      {state === "error" && <ErrorState error={error} onRetry={load} title="Не удалось построить отчёт" />}
      {state === "ready" && result.items.length === 0 && <EmptyState icon={ChartBarSquareIcon} title="Отчёт пуст" detail="Backend не вернул строк для выбранного периода." />}
      {state === "ready" && result.items.length > 0 && (
        <section className={panelClass + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Отель</th>
                  <th className="px-4 py-3 text-right font-bold">Подтверждено</th>
                  <th className="px-4 py-3 text-right font-bold">Отменено</th>
                  <th className="px-4 py-3 text-right font-bold">Выручка</th>
                  <th className="px-4 py-3 text-right font-bold">Ночи</th>
                  <th className="px-4 py-3 text-right font-bold">Оценка</th>
                  <th className="px-4 py-3 text-right font-bold">Отмены</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {result.items.map((row) => (
                  <tr className="hover:bg-stone-50" key={row.hotel_id}>
                    <td className="px-4 py-4">
                      <button className="border-0 bg-transparent p-0 text-left font-bold text-emerald-900 hover:underline" type="button" onClick={() => navigate("/admin/hotels/" + row.hotel_id)}>
                        {row.hotel_title}
                      </button>
                      <span className="ml-2 font-mono text-xs text-stone-500">#{row.hotel_id}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-900">{formatMetric(row.confirmed_bookings)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-900">{formatMetric(row.cancelled_bookings)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-900">{formatMoney(row.booked_revenue)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-900">{formatMetric(row.booked_nights)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-900">{formatMetric(row.average_rating)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-900">{formatMetric(row.cancellation_rate, "%")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <Pagination
              page={page}
              perPage={perPage}
              total={result.total}
              onPageChange={setPage}
              onPerPageChange={(value) => {
                setPage(1);
                setPerPage(value);
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export default function AdminPages({
  section = "hotels",
  detailId = null,
  user,
  navigate = navigateFallback,
  notify,
}) {
  if (!user || user.role !== "admin") {
    return <AccessState user={user} navigate={navigate} />;
  }

  let content;
  switch (section) {
    case "hotels":
      content = <HotelsSection detailId={detailId} navigate={navigate} notify={notify} />;
      break;
    case "rooms":
      content = <RoomsSection hotelId={detailId} navigate={navigate} notify={notify} />;
      break;
    case "images":
      content = <ImagesSection hotelId={detailId} navigate={navigate} notify={notify} />;
      break;
    case "facilities":
      content = <FacilitiesSection notify={notify} />;
      break;
    case "bookings":
      content = <BookingsSection detailId={detailId} navigate={navigate} notify={notify} />;
      break;
    case "analytics":
      content = <AnalyticsSection navigate={navigate} />;
      break;
    default:
      content = (
        <EmptyState
          title="Раздел не найден"
          detail={"Неизвестный административный раздел: " + section}
          action={
            <button className={primaryButtonClass} type="button" onClick={() => navigate("/admin/hotels")}>
              Перейти к отелям
            </button>
          }
        />
      );
  }

  return (
    <AdminLayout section={section} user={user} navigate={navigate}>
      {content}
    </AdminLayout>
  );
}
