import { useCallback, useEffect, useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";

import { api } from "../../api.js";
import { ErrorMessage, LoadingState } from "./AdminStates.jsx";
import { confirmDelete, emptyUser, loadAllPages } from "./helpers.js";

export default function UserPanel({ currentUser }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadAllPages((page) =>
        api.users.list({
          page,
          per_page: 100,
          search: search || undefined,
          sort_by: "email",
          sort_order: "asc",
        }),
      );
      setItems(result.items);
      setError("");
    } catch (exception) {
      setError(exception.message);
    } finally {
      setLoading(false);
    }
  }, [search]);
  useEffect(() => {
    const request = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(request);
  }, [load]);
  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await api.users.update(editing, payload);
      else await api.users.create(payload);
      setForm(emptyUser);
      setEditing(null);
      await load();
    } catch (exception) {
      setError(exception.message);
    }
  };
  const edit = (item) => {
    setEditing(item.id);
    setForm({
      email: item.email,
      first_name: item.first_name,
      last_name: item.last_name,
      password: "",
      role: item.role,
    });
  };
  return (
    <section className="admin-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Доступ</p>
          <h2>Пользователи</h2>
        </div>
        <input
          placeholder="Имя или email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ErrorMessage error={error} />
      <form className="admin-form" onSubmit={save}>
        <h3>
          {editing ? "Редактирование пользователя" : "Новый пользователь"}
        </h3>
        <div className="admin-field-grid">
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          <label>
            Имя
            <input
              required
              maxLength="100"
              value={form.first_name}
              onChange={(event) =>
                setForm({ ...form, first_name: event.target.value })
              }
            />
          </label>
          <label>
            Фамилия
            <input
              required
              maxLength="100"
              value={form.last_name}
              onChange={(event) =>
                setForm({ ...form, last_name: event.target.value })
              }
            />
          </label>
          <label>
            Роль
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value })
              }
            >
              <option value="client">Клиент</option>
              <option value="admin">Администратор</option>
            </select>
          </label>
          <label>
            Пароль
            <input
              required={!editing}
              minLength="8"
              maxLength="72"
              type="password"
              placeholder={editing ? "Не менять" : "Не менее 8 символов"}
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
          </label>
        </div>
        <div className="admin-form-actions">
          <button type="submit">
            <Save />
            Сохранить
          </button>
          {editing && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditing(null);
                setForm(emptyUser);
              }}
            >
              <X />
              Отмена
            </button>
          )}
        </div>
      </form>
      {loading ? (
        <LoadingState />
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Пользователь</th>
                <th>Email</th>
                <th>Роль</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>
                    {item.first_name} {item.last_name}
                  </td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td>
                    <button type="button" onClick={() => edit(item)}>
                      <Pencil />
                    </button>
                    <button
                      type="button"
                      disabled={item.id === currentUser.id}
                      title={
                        item.id === currentUser.id
                          ? "Нельзя удалить текущую учётную запись"
                          : "Удалить"
                      }
                      onClick={() =>
                        confirmDelete(
                          `Удалить пользователя ${item.email}?`,
                          async () => {
                            try {
                              await api.users.delete(item.id);
                              await load();
                            } catch (exception) {
                              setError(exception.message);
                            }
                          },
                        )
                      }
                    >
                      <Trash2 />
                    </button>
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
