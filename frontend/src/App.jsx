import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Heart, LoaderCircle, LogOut, MapPin, Menu, Search, Users, X } from "lucide-react";
import { api, ApiError } from "./api.js";
import { LoginPage, RegisterPage, RegistrationSuccessPage } from "./pages/AuthPages.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import HotelDetailsPage from "./pages/HotelDetailsPage.jsx";
import BookingFlowPage from "./pages/BookingFlowPage.jsx";

const fallbackImages = Array.from({ length: 9 }, (_, index) => `/static/images/hotels/stay-${index + 1}.jpg`);

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function initialDates() {
  const from = new Date();
  from.setDate(from.getDate() + 1);
  const to = new Date(from);
  to.setDate(to.getDate() + 3);
  return { date_from: iso(from), date_to: iso(to) };
}

function imageUrl(image) {
  if (!image?.original_url) return null;
  return image.original_url.startsWith("/") ? image.original_url : `/${image.original_url}`;
}

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
}

function scrollToPageTop(event) {
  event?.preventDefault();
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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
    if (query.length < 2) {
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.locations.suggest(query, { signal: controller.signal })
        .then((data) => { setItems(data); setOpen(true); })
        .catch((error) => { if (error.name !== "AbortError") setItems([]); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
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
  return { items, open: open && value.trim().length >= 2, show: () => setOpen(true), dismiss, choose };
}

function SearchBar({ values, setValues, onSubmit, busy }) {
  const suggestions = useLocationSuggestions(values.location, (location) => setValues((current) => ({ ...current, location })));
  const submit = (event) => {
    suggestions.dismiss();
    onSubmit(event);
  };
  return (
    <form className="search-bar" onSubmit={submit} aria-label="Поиск доступных отелей">
      <label className="search-field location-field">
        <span><MapPin size={18} /> Куда</span>
        <input value={values.location} onChange={(event) => { const location = event.target.value; if (location.trim().length < 2) suggestions.dismiss(); setValues({ ...values, location }); }} onFocus={() => values.location.length > 1 && suggestions.items.length && suggestions.show()} placeholder="Город или страна" autoComplete="off" />
        {suggestions.open && suggestions.items.length > 0 && <div className="suggestions">{suggestions.items.map((item) => <button key={item.label} type="button" onClick={() => suggestions.choose(item.label)}><MapPin size={16} /><span>{item.city}<small>{item.country}</small></span></button>)}</div>}
      </label>
      <label className="search-field"><span><CalendarDays size={18} /> Заезд</span><input type="date" min={iso(new Date())} value={values.date_from} onChange={(event) => setValues({ ...values, date_from: event.target.value })} /></label>
      <label className="search-field"><span><CalendarDays size={18} /> Выезд</span><input type="date" min={values.date_from} value={values.date_to} onChange={(event) => setValues({ ...values, date_to: event.target.value })} /></label>
      <label className="search-field guests-field"><span><Users size={18} /> Гости</span><select value={values.guests} onChange={(event) => setValues({ ...values, guests: event.target.value })}>{[1,2,3,4,5,6].map((number) => <option key={number} value={number}>{number}</option>)}</select><ChevronDown size={16} /></label>
      <button className="search-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Search />}<span>Найти</span></button>
    </form>
  );
}

function UserMenu({ user, onLogout, onNavigate }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const openBookings = () => {
    setOpen(false);
    onNavigate("/account");
  };
  const logout = () => {
    setOpen(false);
    onLogout();
  };

  return (
    <div className={`user-menu${open ? " open" : ""}`} ref={menuRef}>
      <button className="account-header-user" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="account-header-avatar" aria-hidden="true">{user.first_name.charAt(0).toUpperCase()}</span>
        <strong>{user.first_name}</strong>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="user-dropdown" role="menu" aria-label="Меню пользователя">
          <button type="button" role="menuitem" onClick={openBookings}><CalendarDays />Мои бронирования</button>
          <button type="button" role="menuitem" onClick={logout}><LogOut />Выйти</button>
        </div>
      )}
    </div>
  );
}

function Header({ user, onAuth, onLogout, onNavigate, isHome = true, page = "" }) {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState(isHome ? "home" : "catalog");

  useEffect(() => {
    const updateActiveSection = () => {
      if (!isHome) return;
      const marker = window.scrollY + Math.min(window.innerHeight * 0.35, 240);
      const reachedPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
      const catalogTop = document.getElementById("catalog")?.offsetTop ?? Infinity;
      const footerTop = document.getElementById("footer")?.offsetTop ?? Infinity;
      if (reachedPageEnd || marker >= footerTop) setActive("footer");
      else if (marker >= catalogTop) setActive("catalog");
      else setActive("home");
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [isHome]);

  const navigate = (event, section) => {
    setMenu(false);
    setActive(section);
    if (!isHome) {
      event.preventDefault();
      onNavigate(section === "home" ? "/" : `/#${section}`);
      return;
    }
    if (section === "home") {
      scrollToPageTop(event);
      return;
    }
    event.preventDefault();
    const url = new URL(window.location.href);
    url.hash = section;
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <header className="site-header"><a className="brand" href="/" onClick={(event) => navigate(event, "home")}><span>Easy</span>Book.</a><nav className={menu ? "open" : ""}><a className={active === "home" && !page ? "active" : ""} aria-current={active === "home" && !page ? "page" : undefined} href="/" onClick={(event) => navigate(event, "home")}>Главная</a><a className={active === "catalog" && !page ? "active" : ""} href="/#catalog" onClick={(event) => navigate(event, "catalog")}>Отели</a><a className={active === "footer" && !page ? "active" : ""} href="/#footer" onClick={(event) => navigate(event, "footer")}>Контакты</a></nav><div className="header-actions">{user ? <UserMenu user={user} onLogout={onLogout} onNavigate={onNavigate} /> : <button className="login-button" type="button" onClick={onAuth}>Войти</button>}<button className="menu-button" type="button" aria-label="Открыть меню" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></div></header>;
}

export function AuthModal({ onClose, onReady }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (mode === "register") await api.auth.register(form);
      await api.auth.login({ email: form.email, password: form.password });
      onReady(await api.auth.me()); onClose();
    } catch (exception) { setError(exception.message); } finally { setBusy(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть"><X /></button><p className="eyebrow">Ваш EasyBook</p><h2 id="auth-title">{mode === "login" ? "С возвращением" : "Создайте аккаунт"}</h2><p>Бронируйте отели и управляйте поездками в одном месте.</p><div className="auth-tabs"><button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>Вход</button><button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>Регистрация</button></div><form onSubmit={submit}>{mode === "register" && <><label>Имя<input required maxLength="100" autoComplete="given-name" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label><label>Фамилия<input required maxLength="100" autoComplete="family-name" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label></>}<label>Email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></label><label>Пароль<input required type="password" minLength="8" maxLength="72" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="8–72 символа" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}<ArrowRight /></button></form></section></div>;
}

function HotelCard({ hotel, index, featured, dates }) {
  const source = hotel.image || fallbackImages[index % fallbackImages.length];
  const href = `/hotels/${hotel.id}?date_from=${dates.date_from}&date_to=${dates.date_to}&guests=${dates.guests}`;
  return <a className={`hotel-card ${featured ? "featured" : ""}`} href={href}><img src={source} alt="" onError={(event) => { event.currentTarget.src = fallbackImages[index % fallbackImages.length]; }} /><span className="card-shade" /><button className="favorite" type="button" aria-label={`Добавить ${hotel.title} в избранное`} onClick={(event) => event.preventDefault()}><Heart /></button>{hotel.price !== null && <span className="price-badge"><strong>{formatPrice(hotel.price)}</strong> / ночь</span>}<span className="hotel-copy"><strong>{hotel.title}</strong><small><MapPin />{hotel.location}</small></span></a>;
}

function Catalog({ hotels, loading, error, dates }) {
  if (loading) return <div className="catalog-state"><LoaderCircle className="spin" />Проверяем доступные номера…</div>;
  if (error) return <div className="catalog-state error">{error}</div>;
  if (!hotels.length) return <div className="catalog-state">На выбранные даты отелей не найдено. Попробуйте другой город или период.</div>;
  const top = hotels.slice(0, 5);
  const more = hotels.slice(5, 9);
  return <><div className="picked-grid">{top.map((hotel, index) => <HotelCard key={hotel.id} hotel={hotel} index={index} featured={index === 0} dates={dates} />)}</div>{more.length > 0 && <div className="hotel-row">{more.map((hotel, index) => <HotelCard key={hotel.id} hotel={hotel} index={index + 5} dates={dates} />)}</div>}</>;
}

export default function App() {
  const defaults = useMemo(() => initialDates(), []);
  const initial = useMemo(() => { const params = new URLSearchParams(window.location.search); return { location: params.get("location") || "", date_from: params.get("date_from") || defaults.date_from, date_to: params.get("date_to") || defaults.date_to, guests: params.get("guests") || "2" }; }, [defaults]);
  const [values, setValues] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [path, setPath] = useState(window.location.pathname);
  const requestId = useRef(0);

  useEffect(() => { api.auth.me().then(setUser).catch((exception) => { if (!(exception instanceof ApiError && exception.status === 401)) setError(exception.message); }).finally(() => setAuthReady(true)); }, []);
  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);
  useEffect(() => {
    if (path !== "/") return undefined;
    const id = ++requestId.current;
    const controller = new AbortController();
    api.hotels.list({ page: 1, per_page: 9, date_from: query.date_from, date_to: query.date_to, location: query.location || undefined, sort_by: "id", sort_order: "asc" }, { signal: controller.signal })
      .then(async (response) => {
        const enriched = await Promise.all(response.items.map(async (hotel) => {
          const [rooms, images] = await Promise.all([
            api.rooms.list(hotel.id, { date_from: query.date_from, date_to: query.date_to }, { signal: controller.signal }),
            api.images.list(hotel.id, { signal: controller.signal }),
          ]);
          return { ...hotel, price: rooms.length ? Math.min(...rooms.map((room) => room.price)) : null, image: imageUrl(images[0]) };
        }));
        if (id === requestId.current) setHotels(enriched.filter((hotel) => hotel.price !== null));
      })
      .catch((exception) => { if (exception.name !== "AbortError" && id === requestId.current) setError(exception.message); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
    return () => controller.abort();
  }, [query, path]);

  const search = (event) => {
    event.preventDefault();
    if (values.date_to <= values.date_from) { setError("Дата выезда должна быть позже даты заезда."); return; }
    const nextQuery = { ...values };
    const params = new URLSearchParams(Object.entries(nextQuery).filter(([, value]) => value));
    window.history.pushState({}, "", `/?${params}`); setLoading(true); setError(""); setQuery(nextQuery);
    window.setTimeout(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }), 30);
  };
  const logout = async () => { await api.auth.logout().catch(() => null); setUser(null); navigate("/"); };
  const navigate = (destination) => {
    const url = new URL(destination, window.location.origin);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setPath(url.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
    if (url.hash) window.setTimeout(() => document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  useEffect(() => {
    if ((path === "/account" || path === "/booking") && authReady && !user) {
      const returnTo = path === "/booking" ? `${window.location.pathname}${window.location.search}` : "/account";
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [authReady, path, user]);

  if (path === "/login") return <LoginPage onNavigate={navigate} onAuthenticated={setUser} />;
  if (path === "/register") return <RegisterPage onNavigate={navigate} />;
  if (path === "/register/success") return <RegistrationSuccessPage onNavigate={navigate} />;
  if (path === "/booking") {
    if (!authReady) return <main className="checkout-state"><LoaderCircle className="spin" />Подготавливаем бронирование…</main>;
    if (!user) return <main className="checkout-state"><LoaderCircle className="spin" />Переходим ко входу…</main>;
    return <BookingFlowPage user={user} onNavigate={navigate} />;
  }
  if (path === "/account") {
    if (!authReady) return <main className="account-auth-state"><LoaderCircle className="spin" />Загружаем личный кабинет…</main>;
    if (!user) return <main className="account-auth-state"><LoaderCircle className="spin" />Переходим ко входу…</main>;
    return <><Header user={user} onAuth={() => navigate("/login")} onLogout={logout} onNavigate={navigate} isHome={false} page="account" /><AccountPage user={user} onNavigate={navigate} onLogout={logout} /></>;
  }
  const hotelMatch = path.match(/^\/hotels\/(\d+)$/);
  if (hotelMatch) return <><Header user={user} onAuth={() => navigate(`/login?returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`)} onLogout={logout} onNavigate={navigate} isHome={false} /><HotelDetailsPage hotelId={Number(hotelMatch[1])} initialDates={{ date_from: initial.date_from, date_to: initial.date_to }} user={user} onNavigate={navigate} /></>;

  return <><Header user={user} onAuth={() => navigate("/login")} onLogout={logout} onNavigate={navigate} /><main id="top"><section className="hero"><div className="hero-copy"><h1>Забудьте о суете.<br />Начните <em>отдыхать.</em></h1><p className="hero-lead">От уютных городских отелей до вилл у океана — найдите место, в которое захочется вернуться.</p><a className="primary-link" href="#catalog">Выбрать отель <ArrowRight /></a></div><div className="hero-visual"><span className="outline-frame" /><div className="hero-image-frame"><img src="/static/images/hotels/hero-stay.jpg" alt="Светлый номер с панорамными окнами" /></div></div></section><section className="search-wrap"><SearchBar values={values} setValues={setValues} onSubmit={search} busy={loading} /></section><section className="catalog-section" id="catalog"><div className="section-heading"><div><p className="eyebrow">Выбор гостей</p><h2>{query.location ? `Отели — ${query.location}` : "Популярные отели"}</h2></div><a href="#top">Изменить поиск <ArrowRight /></a></div><Catalog hotels={hotels} loading={loading} error={error} dates={query} /></section></main><footer id="footer"><a className="brand" href="/" onClick={scrollToPageTop}><span>Easy</span>Book.</a><p>Бронируем хорошее путешествие — быстро и честно.</p><nav><a href="#catalog">Отели</a><button type="button" onClick={() => navigate(user ? "/account" : "/login")}>Личный кабинет</button></nav><small>© 2026 EasyBook. Курсовой проект по базам данных.</small></footer></>;
}
