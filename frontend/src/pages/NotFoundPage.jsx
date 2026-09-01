import { ArrowLeft, Compass } from "lucide-react";

import ThemeToggle from "../theme.jsx";

export default function NotFoundPage({ onNavigate }) {
  return (
    <main className="not-found-page">
      <ThemeToggle className="theme-toggle-floating" />
      <section>
        <Compass aria-hidden="true" />
        <p className="eyebrow">Маршрут не найден</p>
        <h1>Этой страницы нет</h1>
        <p>Вернитесь к каталогу и продолжите поиск отеля.</p>
        <button type="button" onClick={() => onNavigate("/")}>
          <ArrowLeft />
          На главную
        </button>
      </section>
    </main>
  );
}
