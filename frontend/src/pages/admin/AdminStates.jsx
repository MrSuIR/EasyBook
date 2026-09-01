import { Database, LoaderCircle } from "lucide-react";

export function ErrorMessage({ error }) {
  return error ? (
    <p className="admin-error" role="alert">{error}</p>
  ) : null;
}

export function EmptyState({ children }) {
  return <div className="admin-empty"><Database />{children}</div>;
}

export function LoadingState() {
  return <div className="admin-empty"><LoaderCircle className="spin" />Загружаем данные…</div>;
}
