import { useCallback, useEffect, useState } from "react";
import { Camera, Pencil, Save, Trash2, X } from "lucide-react";

import { api } from "../../api.js";
import { EmptyState, ErrorMessage, LoadingState } from "./AdminStates.jsx";
import {
  confirmDelete,
  emptyHotel,
  emptyRoom,
  loadAllPages,
} from "./helpers.js";

export default function HotelPanel() {
  const [hotels, setHotels] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [images, setImages] = useState([]);
  const [hotelForm, setHotelForm] = useState(emptyHotel);
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [editingHotel, setEditingHotel] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHotels = useCallback(async () => {
    setLoading(true);
    try {
      const [hotelData, facilityData] = await Promise.all([
        loadAllPages((page) =>
          api.hotels.adminList({
            page,
            per_page: 100,
            title: search || undefined,
            sort_by: "title",
            sort_order: "asc",
          }),
        ),
        api.facilities.list(),
      ]);
      setHotels(hotelData.items);
      setFacilities(facilityData);
      setError("");
    } catch (exception) {
      setError(exception.message);
    } finally {
      setLoading(false);
    }
  }, [search]);
  useEffect(() => {
    const request = window.requestAnimationFrame(loadHotels);
    return () => window.cancelAnimationFrame(request);
  }, [loadHotels]);

  const openHotel = async (hotel) => {
    setSelected(hotel);
    setError("");
    try {
      const [roomData, imageData] = await Promise.all([
        api.rooms.adminList(hotel.id),
        api.images.list(hotel.id),
      ]);
      setRooms(roomData);
      setImages(imageData);
    } catch (exception) {
      setError(exception.message);
    }
  };
  const saveHotel = async (event) => {
    event.preventDefault();
    try {
      if (editingHotel) await api.hotels.update(editingHotel, hotelForm);
      else await api.hotels.create(hotelForm);
      setHotelForm(emptyHotel);
      setEditingHotel(null);
      await loadHotels();
    } catch (exception) {
      setError(exception.message);
    }
  };
  const editHotel = (hotel) => {
    setEditingHotel(hotel.id);
    setHotelForm({ title: hotel.title, location: hotel.location });
  };
  const deleteHotel = (hotel) =>
    confirmDelete(`Удалить отель «${hotel.title}»?`, async () => {
      try {
        await api.hotels.delete(hotel.id);
        if (selected?.id === hotel.id) setSelected(null);
        await loadHotels();
      } catch (exception) {
        setError(exception.message);
      }
    });
  const saveRoom = async (event) => {
    event.preventDefault();
    try {
      if (editingRoom)
        await api.rooms.update(selected.id, editingRoom, roomForm);
      else await api.rooms.create(selected.id, roomForm);
      setRoomForm(emptyRoom);
      setEditingRoom(null);
      await openHotel(selected);
    } catch (exception) {
      setError(exception.message);
    }
  };
  const editRoom = (room) => {
    setEditingRoom(room.id);
    setRoomForm({
      title: room.title,
      description: room.description,
      price: room.price,
      quantity: room.quantity,
      facilities_ids: room.facilities.map((item) => item.id),
    });
  };
  const deleteRoom = (room) =>
    confirmDelete(`Удалить тип номера «${room.title}»?`, async () => {
      try {
        await api.rooms.delete(selected.id, room.id);
        await openHotel(selected);
      } catch (exception) {
        setError(exception.message);
      }
    });
  const uploadHotelImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await api.images.upload(selected.id, file);
      await openHotel(selected);
    } catch (exception) {
      setError(exception.message);
    }
    event.target.value = "";
  };
  const replaceHotelImage = async (imageId, file) => {
    if (!file) return;
    try {
      await api.images.replace(selected.id, imageId, file);
      await openHotel(selected);
    } catch (exception) {
      setError(exception.message);
    }
  };

  return (
    <section className="admin-panel">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Каталог</p>
          <h2>Отели и типы номеров</h2>
        </div>
        <input
          aria-label="Поиск отеля"
          placeholder="Поиск по названию"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ErrorMessage error={error} />
      <div className="admin-split">
        <div>
          <form className="admin-form compact" onSubmit={saveHotel}>
            <h3>{editingHotel ? "Редактирование отеля" : "Новый отель"}</h3>
            <label>
              Название
              <input
                required
                maxLength="100"
                value={hotelForm.title}
                onChange={(event) =>
                  setHotelForm({ ...hotelForm, title: event.target.value })
                }
              />
            </label>
            <label>
              Местоположение
              <input
                required
                maxLength="500"
                value={hotelForm.location}
                onChange={(event) =>
                  setHotelForm({ ...hotelForm, location: event.target.value })
                }
              />
            </label>
            <div className="admin-form-actions">
              <button type="submit">
                <Save />
                Сохранить
              </button>
              {editingHotel && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingHotel(null);
                    setHotelForm(emptyHotel);
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
          ) : hotels.length ? (
            <div className="admin-list">
              {hotels.map((hotel) => (
                <article
                  className={selected?.id === hotel.id ? "selected" : ""}
                  key={hotel.id}
                >
                  <button
                    className="admin-list-main"
                    type="button"
                    onClick={() => openHotel(hotel)}
                  >
                    <strong>{hotel.title}</strong>
                    <span>{hotel.location}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Редактировать"
                    onClick={() => editHotel(hotel)}
                  >
                    <Pencil />
                  </button>
                  <button
                    type="button"
                    aria-label="Удалить"
                    onClick={() => deleteHotel(hotel)}
                  >
                    <Trash2 />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>Отели не найдены</EmptyState>
          )}
        </div>
        <div>
          {selected ? (
            <>
              <div className="admin-detail-title">
                <div>
                  <p className="eyebrow">Отель № {selected.id}</p>
                  <h3>{selected.title}</h3>
                </div>
                <label className="admin-upload">
                  <Camera />
                  Добавить фото
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={uploadHotelImage}
                  />
                </label>
              </div>
              <div className="admin-image-strip">
                {images.map((image) => (
                  <figure key={image.id}>
                    <img
                      src={image.original_url}
                      alt={`Фото ${selected.title}`}
                    />
                    <figcaption>
                      <label>
                        Заменить
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            replaceHotelImage(image.id, event.target.files?.[0])
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          confirmDelete("Удалить фотографию?", async () => {
                            await api.images.delete(selected.id, image.id);
                            await openHotel(selected);
                          })
                        }
                      >
                        <Trash2 />
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <form className="admin-form" onSubmit={saveRoom}>
                <h3>
                  {editingRoom ? "Редактирование номера" : "Новый тип номера"}
                </h3>
                <div className="admin-field-grid">
                  <label>
                    Название
                    <input
                      required
                      maxLength="200"
                      value={roomForm.title}
                      onChange={(event) =>
                        setRoomForm({ ...roomForm, title: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Цена за ночь
                    <input
                      required
                      type="number"
                      min="0"
                      value={roomForm.price}
                      onChange={(event) =>
                        setRoomForm({
                          ...roomForm,
                          price: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Количество
                    <input
                      required
                      type="number"
                      min="1"
                      value={roomForm.quantity}
                      onChange={(event) =>
                        setRoomForm({
                          ...roomForm,
                          quantity: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="wide">
                    Описание
                    <textarea
                      required
                      maxLength="500"
                      value={roomForm.description}
                      onChange={(event) =>
                        setRoomForm({
                          ...roomForm,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="wide">
                    Удобства
                    <select
                      multiple
                      value={roomForm.facilities_ids.map(String)}
                      onChange={(event) =>
                        setRoomForm({
                          ...roomForm,
                          facilities_ids: Array.from(
                            event.target.selectedOptions,
                            (option) => Number(option.value),
                          ),
                        })
                      }
                    >
                      {facilities.map((facility) => (
                        <option value={facility.id} key={facility.id}>
                          {facility.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="admin-form-actions">
                  <button type="submit">
                    <Save />
                    Сохранить
                  </button>
                  {editingRoom && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setEditingRoom(null);
                        setRoomForm(emptyRoom);
                      }}
                    >
                      <X />
                      Отмена
                    </button>
                  )}
                </div>
              </form>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Тип</th>
                      <th>Цена</th>
                      <th>Количество</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room.id}>
                        <td>{room.id}</td>
                        <td>
                          <strong>{room.title}</strong>
                          <small>{room.description}</small>
                        </td>
                        <td>{room.price} ₽</td>
                        <td>{room.quantity}</td>
                        <td>
                          <button type="button" onClick={() => editRoom(room)}>
                            <Pencil />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRoom(room)}
                          >
                            <Trash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState>
              Выберите отель, чтобы управлять номерами и фотографиями
            </EmptyState>
          )}
        </div>
      </div>
    </section>
  );
}
