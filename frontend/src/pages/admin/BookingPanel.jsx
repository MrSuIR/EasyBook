import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

import { api } from "../../api.js";
import { ErrorMessage, LoadingState } from "./AdminStates.jsx";
import { confirmDelete } from "./helpers.js";
import Pagination from "./Pagination.jsx";

const PER_PAGE = 20;

export default function BookingPanel() {
  const [items, setItems] = useState([]);
  const [sort, setSort] = useState("id:asc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal) => {
    setLoading(true);
    const [sort_by, sort_order] = sort.split(":");
    try {
      const result = await api.bookings.list(
        { page, per_page: PER_PAGE, sort_by, sort_order },
        { signal },
      );
      setItems(result.items);
      setTotal(result.total);
      setError("");
    } catch (exception) {
      if (exception.name !== "AbortError") setError(exception.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, sort]);
  useEffect(() => {
    const controller = new AbortController();
    const request = window.requestAnimationFrame(() => load(controller.signal));
    return () => {
      window.cancelAnimationFrame(request);
      controller.abort();
    };
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
          <h2>Бронирования</h2>
        </div>
        <select
          value={sort}
          onChange={(event) => {
            setPage(1);
            setSort(event.target.value);
          }}
        >
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
      {!loading && <Pagination page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} />}
    </section>
  );
}
