import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Gauge,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import ThemeToggle from "../theme.jsx";

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

  const runAndClose = (action) => {
    setOpen(false);
    action();
  };

  return (
    <div className={`user-menu${open ? " open" : ""}`} ref={menuRef}>
      <button
        className="account-header-user"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-header-avatar" aria-hidden="true">
          {user.first_name.charAt(0).toUpperCase()}
        </span>
        <strong>{user.first_name}</strong>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div
          className="user-dropdown"
          role="menu"
          aria-label="Меню пользователя"
        >
          {user.role === "admin" && (
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onNavigate("/admin"))}
            >
              <Gauge />
              Администрирование
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => runAndClose(() => onNavigate("/account"))}
          >
            <CalendarDays />
            Мои бронирования
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAndClose(onLogout)}
          >
            <LogOut />
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteHeader({
  user,
  onAuth,
  onLogout,
  onNavigate,
  isHome = true,
  page = "",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(
    isHome ? "home" : "catalog",
  );

  useEffect(() => {
    if (!isHome) return undefined;
    const updateActiveSection = () => {
      const marker = window.scrollY + Math.min(window.innerHeight * 0.35, 240);
      const reachedPageEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 8;
      const catalogTop =
        document.getElementById("catalog")?.offsetTop ?? Infinity;
      const reviewsTop =
        document.getElementById("reviews")?.offsetTop ?? Infinity;
      if (reachedPageEnd || marker >= reviewsTop) setActiveSection("reviews");
      else if (marker >= catalogTop) setActiveSection("catalog");
      else setActiveSection("home");
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [isHome]);

  const navigateToSection = (event, section) => {
    setMenuOpen(false);
    setActiveSection(section);
    if (!isHome) {
      event.preventDefault();
      onNavigate(section === "home" ? "/" : `/#${section}`);
      return;
    }
    event.preventDefault();
    const url = new URL(window.location.href);
    url.hash = section === "home" ? "" : section;
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    if (section === "home") window.scrollTo({ top: 0, behavior: "smooth" });
    else
      document
        .getElementById(section)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="site-header">
      <a
        className="brand"
        href="/"
        onClick={(event) => navigateToSection(event, "home")}
      >
        <span>Easy</span>Book.
      </a>
      <nav className={menuOpen ? "open" : ""}>
        <a
          className={activeSection === "home" && !page ? "active" : ""}
          aria-current={activeSection === "home" && !page ? "page" : undefined}
          href="/"
          onClick={(event) => navigateToSection(event, "home")}
        >
          Главная
        </a>
        <a
          className={activeSection === "catalog" && !page ? "active" : ""}
          href="/#catalog"
          onClick={(event) => navigateToSection(event, "catalog")}
        >
          Отели
        </a>
        <a
          className={activeSection === "reviews" && !page ? "active" : ""}
          href="/#reviews"
          onClick={(event) => navigateToSection(event, "reviews")}
        >
          Отзывы
        </a>
      </nav>
      <div className="header-actions">
        <ThemeToggle />
        {user ? (
          <UserMenu user={user} onLogout={onLogout} onNavigate={onNavigate} />
        ) : (
          <button className="login-button" type="button" onClick={onAuth}>
            Войти
          </button>
        )}
        <button
          className="menu-button"
          type="button"
          aria-label="Открыть меню"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
