import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { api } from "../api.js";

function Brand({ onNavigate }) {
  return <a className="auth-brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}><span>Easy</span>Book.</a>;
}

function PasswordField({ label = "Пароль", value, onChange, autoComplete = "current-password" }) {
  const [visible, setVisible] = useState(false);
  return <label className="auth-field"><span>{label}</span><span className="password-input"><input required type={visible ? "text" : "password"} minLength="8" maxLength="72" autoComplete={autoComplete} value={value} onChange={onChange} placeholder="8–72 символа" /><button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Скрыть пароль" : "Показать пароль"}>{visible ? <EyeOff /> : <Eye />}</button></span></label>;
}

function AuthLayout({ children, onNavigate, compact = false }) {
  return <main className={`auth-page${compact ? " auth-page-compact" : ""}`}><section className="auth-picture" aria-label="Курорт среди гор"><div className="auth-picture-panel"><Brand onNavigate={onNavigate} /><p>Отдых начинается<br />с правильного места.</p><div className="auth-dots" aria-hidden="true"><i /><i className="active" /><i /></div></div></section><section className="auth-form-side">{children}</section></main>;
}

function FormIntro({ title, children }) {
  return <header className="auth-form-intro"><h1>{title}</h1>{children && <p>{children}</p>}</header>;
}

export function RegisterPage({ onNavigate }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", confirmation: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmation) {
      setError("Пароли не совпадают.");
      return;
    }
    setBusy(true);
    try {
      await api.auth.register({ first_name: form.first_name, last_name: form.last_name, email: form.email, password: form.password });
      onNavigate(`/register/success?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (exception) {
      setError(exception.code === "user_already_exists" ? "Аккаунт с таким email уже существует." : exception.message);
    } finally {
      setBusy(false);
    }
  };

  return <AuthLayout onNavigate={onNavigate}><div className="auth-form-card"><Brand onNavigate={onNavigate} /><FormIntro title="Создайте аккаунт" /><form className="auth-page-form" onSubmit={submit}><label className="auth-field"><span>Имя</span><input required minLength="1" maxLength="100" autoComplete="given-name" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} placeholder="Анна" /></label><label className="auth-field"><span>Фамилия</span><input required minLength="1" maxLength="100" autoComplete="family-name" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} placeholder="Петрова" /></label><label className="auth-field"><span>Email</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></label><PasswordField label="Пароль" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><PasswordField label="Повторите пароль" autoComplete="new-password" value={form.confirmation} onChange={(event) => setForm({ ...form, confirmation: event.target.value })} />{error && <p className="auth-form-error" role="alert">{error}</p>}<button className="auth-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" />Создаём аккаунт…</> : <>Зарегистрироваться<ArrowRight /></>}</button></form><p className="auth-switch">Уже есть аккаунт? <a href="/login" onClick={(event) => { event.preventDefault(); onNavigate("/login"); }}>Войти</a></p></div></AuthLayout>;
}

export function LoginPage({ onNavigate, onAuthenticated }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.auth.login(form);
      onAuthenticated(await api.auth.me());
      const requested = new URLSearchParams(window.location.search).get("returnTo");
      const returnTo = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
      onNavigate(returnTo);
    } catch (exception) {
      setError(exception.code === "login_failed" ? "Неверный email или пароль." : exception.message);
    } finally {
      setBusy(false);
    }
  };

  return <AuthLayout onNavigate={onNavigate} compact><div className="auth-form-card"><Brand onNavigate={onNavigate} /><FormIntro title="Войдите в аккаунт">Продолжите планировать путешествие с EasyBook.</FormIntro><form className="auth-page-form" onSubmit={submit}><label className="auth-field"><span>Email</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></label><PasswordField value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{error && <p className="auth-form-error" role="alert">{error}</p>}<button className="auth-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" />Входим…</> : <>Войти<ArrowRight /></>}</button></form><p className="auth-switch">Впервые в EasyBook? <a href="/register" onClick={(event) => { event.preventDefault(); onNavigate("/register"); }}>Создать аккаунт</a></p></div></AuthLayout>;
}

export function RegistrationSuccessPage({ onNavigate }) {
  const email = new URLSearchParams(window.location.search).get("email");
  return <main className="auth-success"><section className="auth-success-card"><Brand onNavigate={onNavigate} /><CheckCircle2 className="success-check" aria-hidden="true" /><h1>Аккаунт успешно создан</h1><p>{email ? <>Адрес <strong>{email}</strong> зарегистрирован.</> : "Регистрация завершена."}<br />Войдите, чтобы начать бронирование.</p><button className="auth-primary" type="button" onClick={() => onNavigate("/login")}>Войти в аккаунт<ArrowRight /></button></section></main>;
}
