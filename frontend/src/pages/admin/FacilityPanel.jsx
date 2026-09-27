import { useCallback, useEffect, useState } from "react";
import {
  BedDouble,
  Camera,
  CarFront,
  Coffee,
  ConciergeBell,
  Dumbbell,
  PawPrint,
  Pencil,
  Plane,
  Snowflake,
  Sparkles,
  Trash2,
  Tv,
  UsersRound,
  Utensils,
  Waves,
  Wifi,
  X,
} from "lucide-react";

import { api } from "../../api.js";
import { ErrorMessage, LoadingState } from "./AdminStates.jsx";
import { confirmDelete } from "./helpers.js";

const facilityIcons = {
  "wi-fi": Wifi,
  breakfast: Coffee,
  parking: CarFront,
  pool: Waves,
  spa: Sparkles,
  "air conditioning": Snowflake,
  restaurant: Utensils,
  "fitness center": Dumbbell,
  "airport transfer": Plane,
  "pet friendly": PawPrint,
  "room service": ConciergeBell,
  "family rooms": UsersRound,
  телевизор: Tv,
};

function FacilityIcon({ item }) {
  const Icon = facilityIcons[item.title.trim().toLowerCase()] || BedDouble;
  return item.image_url ? (
    <>
      <img
        src={item.image_url}
        alt=""
        onError={(event) => {
          event.currentTarget.hidden = true;
          event.currentTarget.nextElementSibling.hidden = false;
        }}
      />
      <Icon aria-hidden="true" hidden />
    </>
  ) : (
    <Icon aria-hidden="true" />
  );
}

export default function FacilityPanel() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.facilities.list());
      setError("");
    } catch (exception) {
      setError(exception.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const request = window.requestAnimationFrame(load);
    return () => window.cancelAnimationFrame(request);
  }, [load]);
  const save = async (event) => {
    event.preventDefault();
    try {
      if (editing) await api.facilities.update(editing, { title });
      else await api.facilities.create({ title });
      setTitle("");
      setEditing(null);
      await load();
    } catch (exception) {
      setError(exception.message);
    }
  };
  const upload = async (id, file) => {
    if (!file) return;
    try {
      await api.facilities.uploadImage(id, file);
      await load();
    } catch (exception) {
      setError(exception.message);
    }
  };
  return (
    <section className="admin-panel">
      <div className="admin-section-heading">
        <div>
          <h2>Удобства</h2>
        </div>
      </div>
      <ErrorMessage error={error} />
      <form className="admin-form compact horizontal" onSubmit={save}>
        <label>
          Название
          <input
            required
            maxLength="100"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <button type="submit">
          {editing ? "Сохранить" : "Добавить"}
        </button>
        {editing && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEditing(null);
              setTitle("");
            }}
          >
            <X />
            Отмена
          </button>
        )}
      </form>
      {loading ? (
        <LoadingState />
      ) : (
        <div className="facility-admin-grid">
          {items.map((item) => (
            <article key={item.id}>
              <FacilityIcon item={item} />
              <div>
                <strong>{item.title}</strong>
                <small>№ {item.id}</small>
              </div>
              <label className="icon-button" title="Загрузить иконку">
                <Camera />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => upload(item.id, event.target.files?.[0])}
                />
              </label>
              {item.image_url && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.facilities.deleteImage(item.id);
                      await load();
                    } catch (exception) {
                      setError(exception.message);
                    }
                  }}
                >
                  <X />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditing(item.id);
                  setTitle(item.title);
                }}
              >
                <Pencil />
              </button>
              <button
                type="button"
                onClick={() =>
                  confirmDelete(
                    `Удалить удобство «${item.title}»?`,
                    async () => {
                      try {
                        await api.facilities.delete(item.id);
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
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
