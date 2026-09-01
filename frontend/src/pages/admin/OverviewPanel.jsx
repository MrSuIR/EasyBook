import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Database,
  RefreshCw,
  Users,
} from "lucide-react";

import { api } from "../../api.js";
import { ErrorMessage, LoadingState } from "./AdminStates.jsx";
import { loadAllPages } from "./helpers.js";

export default function OverviewPanel() {
  const [state, setState] = useState({ loading: true, error: "", stats: null });
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [hotels, bookings, users, analytics, live, ready] =
        await Promise.all([
          api.hotels.adminList({ page: 1, per_page: 1 }),
          api.bookings.list({ page: 1, per_page: 1 }),
          api.users.list({ page: 1, per_page: 1 }),
          loadAllPages((page) => api.analytics.hotels({ page, per_page: 100 })),
          api.health.live(),
          api.health.ready(),
        ]);
      const revenue = analytics.items.reduce(
        (sum, item) => sum + item.booked_revenue,
        0,
      );
      setState({
        loading: false,
        error: "",
        stats: {
          hotels: hotels.total,
          bookings: bookings.total,
          users: users.total,
          revenue,
          live: live.status,
          ready: ready.status,
        },
      });
    } catch (error) {
      setState({ loading: false, error: error.message, stats: null });
    }
  }, []);
  useEffect(() => {
    const request = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(request);
  }, [load]);
  if (state.loading) return <LoadingState />;
  return (
    <section className="admin-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Состояние системы</p>
          <h2>Обзор EasyBook</h2>
        </div>
        <button type="button" onClick={load}>
          <RefreshCw />
          Обновить
        </button>
      </div>
      <ErrorMessage error={state.error} />
      {state.stats && (
        <div className="admin-stat-grid">
          <article>
            <Building2 />
            <span>Отели</span>
            <strong>{state.stats.hotels}</strong>
          </article>
          <article>
            <Database />
            <span>Бронирования</span>
            <strong>{state.stats.bookings}</strong>
          </article>
          <article>
            <Users />
            <span>Пользователи</span>
            <strong>{state.stats.users}</strong>
          </article>
          <article>
            <BarChart3 />
            <span>Выручка</span>
            <strong>
              {new Intl.NumberFormat("ru-RU").format(state.stats.revenue)} ₽
            </strong>
          </article>
          <article className="admin-health">
            <CheckCircle2 />
            <span>API / БД</span>
            <strong>
              {state.stats.live} / {state.stats.ready}
            </strong>
          </article>
        </div>
      )}
    </section>
  );
}
