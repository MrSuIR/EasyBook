import { useCallback, useEffect, useState } from "react";

import { api } from "../../api.js";
import { addLocalDays, localDateKey } from "../../dateUtils.js";
import { ErrorMessage, LoadingState } from "./AdminStates.jsx";
import { loadAllPages } from "./helpers.js";

export default function AnalyticsPanel() {
  const defaults = {
    date_from: localDateKey(addLocalDays(new Date(), -365)),
    date_to: localDateKey(addLocalDays(new Date(), 1)),
    sort_by: "booked_revenue",
    sort_order: "desc",
  };
  const [filters, setFilters] = useState(defaults);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadAllPages((page) =>
        api.analytics.hotels({ page, per_page: 100, ...filters }),
      );
      setItems(result.items);
      setError("");
    } catch (exception) {
      setError(exception.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    const request = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(request);
  }, [load]);
  return (
    <section className="admin-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Отчёт</p>
          <h2>Аналитика по отелям</h2>
        </div>
      </div>
      <div className="admin-filter-row">
        <label>
          С
          <input
            type="date"
            value={filters.date_from}
            onChange={(event) =>
              setFilters({ ...filters, date_from: event.target.value })
            }
          />
        </label>
        <label>
          По
          <input
            type="date"
            value={filters.date_to}
            onChange={(event) =>
              setFilters({ ...filters, date_to: event.target.value })
            }
          />
        </label>
        <label>
          Показатель
          <select
            value={filters.sort_by}
            onChange={(event) =>
              setFilters({ ...filters, sort_by: event.target.value })
            }
          >
            <option value="booked_revenue">Выручка</option>
            <option value="confirmed_bookings">Подтверждения</option>
            <option value="cancelled_bookings">Отмены</option>
            <option value="average_rating">Оценка</option>
            <option value="cancellation_rate">Доля отмен</option>
          </select>
        </label>
        <label>
          Порядок
          <select
            value={filters.sort_order}
            onChange={(event) =>
              setFilters({ ...filters, sort_order: event.target.value })
            }
          >
            <option value="desc">По убыванию</option>
            <option value="asc">По возрастанию</option>
          </select>
        </label>
      </div>
      <ErrorMessage error={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Отель</th>
                <th>Подтверждено</th>
                <th>Отменено</th>
                <th>Ночи</th>
                <th>Выручка</th>
                <th>Оценка</th>
                <th>Отмены</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.hotel_id}>
                  <td>
                    <strong>{item.hotel_title}</strong>
                    <small>{item.hotel_location}</small>
                  </td>
                  <td>{item.confirmed_bookings}</td>
                  <td>{item.cancelled_bookings}</td>
                  <td>{item.booked_nights}</td>
                  <td>
                    {new Intl.NumberFormat("ru-RU").format(item.booked_revenue)}{" "}
                    ₽
                  </td>
                  <td>{item.average_rating ?? "—"}</td>
                  <td>{item.cancellation_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
