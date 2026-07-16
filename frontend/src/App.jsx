import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { api, ApiError } from "./api.js";
import { EmptyState, Footer, Header, LoadingState, Modal } from "./components.jsx";
import AccountPages from "./pages/AccountPages.jsx";
import AdminPages from "./pages/AdminPages.jsx";
import { HomePage, HotelPage, SearchPage } from "./pages/PublicPages.jsx";
import { apiMessage } from "./utils.js";

function useLocation() {
  const snapshot = () => ({ pathname: window.location.pathname, search: window.location.search, hash: window.location.hash });
  const [location, setLocation] = useState(snapshot);
  useEffect(() => {
    const update = () => setLocation(snapshot());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const navigate = useCallback((target, { replace = false } = {}) => {
    const url = new URL(target, window.location.origin);
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history[replace ? "replaceState" : "pushState"]({}, "", next);
    setLocation({ pathname: url.pathname, search: url.search, hash: url.hash });
    requestAnimationFrame(() => url.hash
      ? document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth", block: "start" })
      : window.scrollTo({ top: 0, behavior: "instant" }));
  }, []);
  return [location, navigate];
}

function AuthDialog({ onClose, onAuthenticated, notify }) {
  const [mode, setMode] = useState("login");
  const [values, setValues] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") await api.auth.register(values);
      await api.auth.login(values);
      onAuthenticated(await api.auth.me());
      notify("Авторизация выполнена.");
      onClose();
    } catch (exception) {
      setError(apiMessage(exception, "Не удалось войти в аккаунт."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Авторизация" onClose={onClose}>
      <div className="auth-dialog">
        <p className="eyebrow">Ваш EasyBook</p>
        <h2>{mode === "login" ? "Продолжите путешествие" : "Создайте профиль"}</h2>
        <p>Войдите, чтобы бронировать номера, управлять поездками и оставлять отзывы.</p>
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Войти</button>
          <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => { setMode("register"); setError(""); }}>Регистрация</button>
        </div>
        <form onSubmit={submit}>
          <label>Email<input type="email" required autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} placeholder="name@example.com" /></label>
          <label>Пароль<input type="password" required minLength={8} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} placeholder="От 8 до 72 символов" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}{!busy && <ArrowRightIcon />}</button>
        </form>
        <small className="auth-note">Регистрация создаёт роль клиента. Сессия хранится в HttpOnly cookie.</small>
      </div>
    </Modal>
  );
}

function StatePage({ title, detail, actionLabel, onAction }) {
  return <main className="standalone-state-page"><EmptyState title={title} detail={detail} action={<button className="primary-button" type="button" onClick={onAction}>{actionLabel}</button>} /></main>;
}

function Toast({ toast, close }) {
  if (!toast) return null;
  const Icon = toast.type === "error" ? ExclamationTriangleIcon : CheckCircleIcon;
  return <div className={`toast ${toast.type === "error" ? "toast-error" : ""}`} role={toast.type === "error" ? "alert" : "status"}><Icon /><span>{toast.message}</span><button className="icon-button" type="button" aria-label="Закрыть" onClick={close}><XMarkIcon /></button></div>;
}

function matchRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { name: "home" };
  if (path === "/search") return { name: "search" };
  let match = path.match(/^\/hotels\/(\d+)$/);
  if (match) return { name: "hotel", id: Number(match[1]) };
  if (path === "/account") return { name: "account", section: "overview" };
  if (path === "/account/bookings") return { name: "account", section: "bookings" };
  match = path.match(/^\/account\/bookings\/(\d+)$/);
  if (match) return { name: "account", section: "booking", id: Number(match[1]) };
  if (path === "/account/reviews") return { name: "account", section: "reviews" };
  if (path === "/admin" || path === "/admin/hotels") return { name: "admin", section: "hotels" };
  match = path.match(/^\/admin\/hotels\/(\d+)\/rooms$/);
  if (match) return { name: "admin", section: "rooms", id: Number(match[1]) };
  match = path.match(/^\/admin\/hotels\/(\d+)\/images$/);
  if (match) return { name: "admin", section: "images", id: Number(match[1]) };
  match = path.match(/^\/admin\/hotels\/(\d+)$/);
  if (match) return { name: "admin", section: "hotels", id: Number(match[1]) };
  if (path === "/admin/facilities") return { name: "admin", section: "facilities" };
  if (path === "/admin/bookings") return { name: "admin", section: "bookings" };
  match = path.match(/^\/admin\/bookings\/(\d+)$/);
  if (match) return { name: "admin", section: "bookings", id: Number(match[1]) };
  if (path === "/admin/analytics") return { name: "admin", section: "analytics" };
  return { name: "not-found" };
}

export function App() {
  const [location, navigate] = useLocation();
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [serviceStatus, setServiceStatus] = useState("checking");
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const notify = useCallback((message, type = "success") => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), type === "error" ? 6500 : 4200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    let active = true;
    Promise.all([api.health.live(), api.health.ready()])
      .then(() => { if (active) setServiceStatus("ready"); })
      .catch(() => { if (active) setServiceStatus("offline"); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    api.auth.me().then((data) => { if (active) setUser(data); }).catch((exception) => {
      if (active && !(exception instanceof ApiError && exception.status === 401)) notify(apiMessage(exception, "Не удалось проверить сессию."), "error");
    }).finally(() => { if (active) setSessionLoading(false); });
    return () => { active = false; };
  }, [notify]);
  const route = useMemo(() => matchRoute(location.pathname), [location.pathname]);
  const requireAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const logout = async () => {
    try { await api.auth.logout(); } catch { /* Cookie may already be expired. */ }
    setUser(null);
    notify("Вы вышли из аккаунта.");
    navigate("/");
  };

  let page;
  if (route.name === "home") {
    page = <HomePage navigate={navigate} />;
  } else if (route.name === "search") {
    page = <SearchPage key={location.search} navigate={navigate} locationSearch={location.search} />;
  } else if (route.name === "hotel") {
    page = <HotelPage key={`${route.id}:${location.search}`} hotelId={route.id} navigate={navigate} locationSearch={location.search} user={user} onAuthRequired={requireAuth} notify={notify} />;
  } else if (route.name === "account") {
    page = sessionLoading
      ? <main className="standalone-state-page"><LoadingState label="Проверяем сессию…" /></main>
      : user
        ? <AccountPages section={route.section} detailId={route.id} user={user} navigate={navigate} notify={notify} onAuthRequired={requireAuth} />
        : <StatePage title="Войдите в аккаунт" detail="Личный кабинет хранит ваши бронирования и отзывы." actionLabel="Войти" onAction={requireAuth} />;
  } else if (route.name === "admin") {
    page = sessionLoading
      ? <main className="standalone-state-page"><LoadingState label="Проверяем права…" /></main>
      : !user
        ? <StatePage title="Требуется авторизация" detail="Войдите под учётной записью администратора." actionLabel="Войти" onAction={requireAuth} />
        : user.role !== "admin"
          ? <StatePage title="Недостаточно прав" detail="Этот раздел доступен только администраторам EasyBook." actionLabel="На главную" onAction={() => navigate("/")} />
          : <AdminPages section={route.section} detailId={route.id} user={user} navigate={navigate} notify={notify} />;
  } else {
    page = <StatePage title="Страница не найдена" detail="Возможно, адрес изменился или в ссылке есть опечатка." actionLabel="На главную" onAction={() => navigate("/")} />;
  }

  const usesAdminShell = route.name === "admin" && user?.role === "admin";

  return (
    <div className="app-shell">
      {!usesAdminShell && <Header user={user} navigate={navigate} onAuth={requireAuth} onLogout={logout} />}
      {page}
      {!usesAdminShell && <Footer navigate={navigate} serviceStatus={serviceStatus} />}
      {authOpen && <AuthDialog onClose={closeAuth} onAuthenticated={setUser} notify={notify} />}
      <Toast toast={toast} close={() => setToast(null)} />
    </div>
  );
}
