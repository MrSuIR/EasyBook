import { useEffect, useId, useRef, useState } from "react";
import {
  Bars3Icon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChevronDownIcon,
  HomeModernIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { buildPath, formatDate, plural, searchDefaults } from "./utils.js";

export function Link({ to, navigate, children, className = "", onClick, ...props }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (
          !event.defaultPrevented
          && event.button === 0
          && !event.metaKey
          && !event.ctrlKey
          && !event.shiftKey
          && !event.altKey
        ) {
          event.preventDefault();
          onClick?.(event);
          navigate(to);
        }
      }}
      {...props}
    >
      {children}
    </a>
  );
}

export function Header({ user, navigate, onAuth, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const close = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [profileOpen]);

  const go = (path) => {
    setMenuOpen(false);
    setProfileOpen(false);
    navigate(path);
  };

  return (
    <header className="site-header">
      <Link to="/" navigate={navigate} className="wordmark" aria-label="EasyBook — главная">
        EasyBook
      </Link>
      <nav className="main-nav" aria-label="Основная навигация">
        <Link to="/#destinations" navigate={navigate}>Направления</Link>
        <Link to={buildPath("/search", searchDefaults())} navigate={navigate}>Отели</Link>
        <Link to="/#inspiration" navigate={navigate}>Идеи для поездок</Link>
      </nav>
      <div className="header-actions">
        {user?.role === "admin" && (
          <button className="header-action desktop-action" type="button" onClick={() => go("/admin/hotels")}>
            <ShieldCheckIcon aria-hidden="true" /> Админ-панель
          </button>
        )}
        {user && (
          <button className="header-action desktop-action" type="button" onClick={() => go("/account/bookings")}>
            <HomeModernIcon aria-hidden="true" /> Мои поездки
          </button>
        )}
        <div className="profile-wrap" ref={profileRef}>
          <button
            className="header-action"
            type="button"
            aria-haspopup={user ? "menu" : undefined}
            aria-expanded={user ? profileOpen : undefined}
            onClick={() => (user ? setProfileOpen((open) => !open) : onAuth())}
          >
            <UserCircleIcon aria-hidden="true" />
            <span>{user ? user.email.split("@")[0] : "Войти"}</span>
          </button>
          {user && profileOpen && (
            <div className="profile-popover" role="menu">
              <div className="profile-summary">
                <strong>{user.email}</strong>
                <span>{user.role === "admin" ? "Администратор" : "Путешественник"}</span>
              </div>
              <button type="button" role="menuitem" onClick={() => go("/account")}>Личный кабинет</button>
              <button type="button" role="menuitem" onClick={() => go("/account/bookings")}>Бронирования</button>
              <button type="button" role="menuitem" onClick={() => go("/account/reviews")}>Отзывы</button>
              {user.role === "admin" && (
                <button type="button" role="menuitem" onClick={() => go("/admin/hotels")}>Управление сервисом</button>
              )}
              <button className="danger-menu-item" type="button" role="menuitem" onClick={onLogout}>Выйти</button>
            </div>
          )}
        </div>
        <button
          className="icon-button menu-toggle"
          type="button"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <XMarkIcon aria-hidden="true" /> : <Bars3Icon aria-hidden="true" />}
        </button>
      </div>
      {menuOpen && (
        <nav className="mobile-menu" aria-label="Мобильная навигация">
          <button type="button" onClick={() => go("/")}>Главная</button>
          <button type="button" onClick={() => go(buildPath("/search", searchDefaults()))}>Найти отель</button>
          {user ? (
            <>
              <button type="button" onClick={() => go("/account/bookings")}>Мои бронирования</button>
              <button type="button" onClick={() => go("/account/reviews")}>Мои отзывы</button>
              {user.role === "admin" && <button type="button" onClick={() => go("/admin/hotels")}>Админ-панель</button>}
            </>
          ) : (
            <button type="button" onClick={() => { setMenuOpen(false); onAuth(); }}>Войти</button>
          )}
        </nav>
      )}
    </header>
  );
}

function SearchField({ icon: Icon, label, className = "", children }) {
  return (
    <label className={`search-field ${className}`}>
      <Icon aria-hidden="true" />
      <span className="search-field-copy">
        <small>{label}</small>
        {children}
      </span>
    </label>
  );
}

export function SearchForm({ initial, onSearch, compact = false, busy = false }) {
  const [values, setValues] = useState(() => searchDefaults(initial));
  const guestId = useId();

  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (values.date_to <= values.date_from) return;
    onSearch(values);
  };

  return (
    <form className={`search-form ${compact ? "search-form-compact" : ""}`} onSubmit={submit}>
      <div className="search-fields">
        <SearchField icon={MapPinIcon} label="Куда едем?" className="destination-input">
          <input
            value={values.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Город или направление"
            aria-label="Город или направление"
          />
        </SearchField>
        <SearchField icon={CalendarDaysIcon} label="Заезд">
          <span className="visible-field-value" aria-hidden="true">{formatDate(values.date_from)}</span>
          <input
            className="native-field-control"
            type="date"
            min={new Date().toLocaleDateString("en-CA")}
            value={values.date_from}
            onChange={(event) => update("date_from", event.target.value)}
            aria-label="Дата заезда"
            required
          />
        </SearchField>
        <SearchField icon={CalendarDaysIcon} label="Выезд">
          <span className="visible-field-value" aria-hidden="true">{formatDate(values.date_to)}</span>
          <input
            className="native-field-control"
            type="date"
            min={values.date_from}
            value={values.date_to}
            onChange={(event) => update("date_to", event.target.value)}
            aria-label="Дата выезда"
            required
          />
        </SearchField>
        <SearchField icon={UserGroupIcon} label="Гости">
          <span className="visible-field-value" aria-hidden="true">
            {values.guests} {plural(values.guests, "гость", "гостя", "гостей")}
          </span>
          <select
            id={guestId}
            className="native-field-control"
            value={values.guests}
            onChange={(event) => update("guests", Number(event.target.value))}
            aria-label="Количество гостей"
          >
            {[1, 2, 3, 4, 5, 6].map((amount) => <option key={amount} value={amount}>{amount}</option>)}
          </select>
          <ChevronDownIcon className="field-chevron" aria-hidden="true" />
        </SearchField>
        <button className="primary-button search-button" type="submit" disabled={busy || values.date_to <= values.date_from}>
          <span>{busy ? "Ищем…" : "Найти отели"}</span>
          <MagnifyingGlassIcon aria-hidden="true" />
        </button>
      </div>
      {!compact && (
        <div className="search-hint">
          <BuildingOffice2Icon aria-hidden="true" />
          <span>Покажем только реально доступные номера на выбранные даты.</span>
        </div>
      )}
    </form>
  );
}

export function Modal({ title, onClose, children, size = "medium" }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(document.activeElement);

  useEffect(() => {
    const focusToRestore = previousFocus.current;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    focusable?.focus();

    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")];
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      focusToRestore?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-card modal-${size}`} ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-button modal-close" type="button" aria-label="Закрыть" onClick={onClose}>
          <XMarkIcon aria-hidden="true" />
        </button>
        {children}
      </section>
    </div>
  );
}

export function LoadingState({ label = "Загружаем данные…", compact = false }) {
  return (
    <div className={`page-state loading-state ${compact ? "compact-state" : ""}`} role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, detail, action }) {
  return (
    <div className="page-state empty-state">
      <HomeModernIcon aria-hidden="true" />
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Что-то пошло не так", detail, onRetry }) {
  return (
    <div className="page-state error-state" role="alert">
      <h2>{title}</h2>
      <p>{detail}</p>
      {onRetry && <button className="secondary-button" type="button" onClick={onRetry}>Повторить</button>}
    </div>
  );
}

export function Pagination({ page, perPage, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((value) => value >= 1 && value <= totalPages);
  return (
    <nav className="pagination" aria-label="Пагинация">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Назад</button>
      {pages.map((value, index) => (
        <span key={value} className="pagination-item-wrap">
          {index > 0 && value - pages[index - 1] > 1 && <span className="pagination-ellipsis">…</span>}
          <button type="button" className={value === page ? "active" : ""} aria-current={value === page ? "page" : undefined} onClick={() => onPage(value)}>{value}</button>
        </span>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Вперёд</button>
    </nav>
  );
}

export function Footer({ navigate, serviceStatus = "checking" }) {
  return (
    <footer className="site-footer">
      <Link to="/" navigate={navigate} className="wordmark">EasyBook</Link>
      <p>Онлайн-сервис бронирования отелей</p>
      <span className={`service-status service-${serviceStatus}`}><i aria-hidden="true" />{serviceStatus === "ready" ? "Сервис работает" : serviceStatus === "offline" ? "Сервис недоступен" : "Проверяем сервис"}</span>
    </footer>
  );
}
