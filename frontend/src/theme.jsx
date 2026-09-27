import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  applyTheme,
  DARK_THEME_QUERY,
  getPreferredTheme,
  THEME_STORAGE_KEY,
} from "./theme.js";

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || getPreferredTheme(),
  );
  const isDark = theme === "dark";

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_THEME_QUERY);
    const syncSystemTheme = (event) => {
      if (window.localStorage.getItem(THEME_STORAGE_KEY)) return;
      const nextTheme = event.matches ? "dark" : "light";
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };
    const syncStoredTheme = (event) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const nextTheme =
        event.newValue === "dark" || event.newValue === "light"
          ? event.newValue
          : getPreferredTheme();
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };
    mediaQuery.addEventListener("change", syncSystemTheme);
    window.addEventListener("storage", syncStoredTheme);
    return () => {
      mediaQuery.removeEventListener("change", syncSystemTheme);
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const nextThemeLabel = isDark ? "светлую" : "тёмную";
  return (
    <button
      className={`theme-toggle${className ? ` ${className}` : ""}`}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Тёмная тема"
      title={`Включить ${nextThemeLabel} тему`}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <Sun className="theme-toggle-sun" />
        <Moon className="theme-toggle-moon" />
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  );
}
