import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

import { api } from "../../api.js";
import { ErrorMessage, LoadingState } from "./AdminStates.jsx";
import { confirmDelete, loadAllPages } from "./helpers.js";

export default function BookingPanel() {
  const [items, setItems] = useState([]);
  const [sort, setSort] = useState("id:asc");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const [sort_by, sort_order] = sort.split(":");
    try {
      const result = await loadAllPages((page) =>
        api.bookings.list({ page, per_page: 100, sort_by, sort_order }),
      );
      setItems(result.items);
      setError("");
    } catch (exception) {
      setError(exception.message);
    } finally {
      setLoading(false);
    }
  }, [sort]);
  useEffect(() => {
    const request = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(request);
  }, [load]);
  const cancel = (item) =>
    confirmDelete(`Отменить бронирование № ${item.id}?`, async () => {
      try {
        await api.bookings.cancel(item.id);
        await load();
      } catch (exception) {
        setError(exception.message);
      }
    });
  return (
    <section className="admin-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Операции</p>
          <h2>Бронирования</h2>
        </div>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="id:asc">Сначала старые</option>
          <option value="id:desc">Сначала новые</option>
          <option value="date_from:asc">По дате заезда</option>
          <option value="price:desc">По цене</option>
          <option value="status:asc">По статусу</option>
        </select>
      </div>
      <ErrorMessage error={error} />
      {loading ? (
        <LoadingState />
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Номер</th>
                <th>Период</th>
                <th>Стоимость</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.user_id}</td>
                  <td>{item.room_id}</td>
                  <td>
                    {item.date_from}
                    <br />
                    {item.date_to}
                  </td>
                  <td>{item.total_cost} ₽</td>
                  <td>
                    <span className={`admin-status ${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    {item.status === "confirmed" && (
                      <button type="button" onClick={() => cancel(item)}>
                        <X />
                        Отменить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
