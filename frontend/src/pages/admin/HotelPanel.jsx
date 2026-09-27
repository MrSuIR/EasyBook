import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, BedDouble, Camera, Check, Images, MapPin, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";

import { api } from "../../api.js";
import { EmptyState, ErrorMessage, LoadingState } from "./AdminStates.jsx";
import {
  confirmDelete,
  emptyHotel,
  emptyRoom,
  loadAllPages,
} from "./helpers.js";

const hotelImageCache = new Map();
const hotelFallback = "/images/hotel-fallback.jpg";
const roomIllustrations = {
  standard: "/images/room-standard.jpg",
  comfort: "/images/room-comfort.jpg",
  suite: "/images/room-suite.jpg",
};

function roomIllustration(title) {
  const normalized = title.toLowerCase();
  if (normalized.includes("suite") || normalized.includes("люкс")) return roomIllustrations.suite;
  if (normalized.includes("comfort") || normalized.includes("комфорт")) return roomIllustrations.comfort;
  return roomIllustrations.standard;
}

function HotelThumbnail({ hotel }) {
  const imageRef = useRef(null);
  const [url, setUrl] = useState(() => hotelImageCache.get(hotel.id) || null);

  useEffect(() => {
    if (hotelImageCache.has(hotel.id)) {
      return undefined;
    }
    const element = imageRef.current;
    let active = true;
    const load = async () => {
      try {
        const hotelImages = await api.images.list(hotel.id);
        const source = hotelImages[0]?.original_url || null;
        hotelImageCache.set(hotel.id, source);
        if (active) setUrl(source);
      } catch {
        // Thumbnails are supplemental; the selected hotel reports detail errors.
      }
    };
    if (!element || !window.IntersectionObserver) {
      load();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        load();
      }
    }, { root: element.closest(".admin-list"), rootMargin: "120px" });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [hotel.id]);

  return (
    <span className="admin-hotel-thumbnail" ref={imageRef}>
      <img src={hotelImageCache.get(hotel.id) || url || hotelFallback} alt="" loading="lazy" />
    </span>
  );
}

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
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const detailRequest = useRef(0);

  const loadHotels = useCallback(async () => {
    setLoading(true);
    try {
      const [hotelData, facilityData] = await Promise.all([
        loadAllPages((page) =>
          api.hotels.adminList({
            page,
            per_page: 100,
            title: search || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
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
  }, [search, statusFilter]);
  useEffect(() => {
    const request = window.requestAnimationFrame(loadHotels);
    return () => window.cancelAnimationFrame(request);
  }, [loadHotels]);

  const openHotel = useCallback(async (hotel) => {
    const request = ++detailRequest.current;
    setSelected(hotel);
    setDetailLoading(true);
    setRooms([]);
    setImages([]);
    setShowHotelForm(false);
    setShowRoomForm(false);
    setEditingRoom(null);
    setRoomForm(emptyRoom);
    setError("");
    try {
      const [roomData, imageData] = await Promise.all([
        api.rooms.adminList(hotel.id),
        api.images.list(hotel.id),
      ]);
      if (request === detailRequest.current) {
        setRooms(roomData);
        setImages(imageData);
        hotelImageCache.set(hotel.id, imageData[0]?.original_url || null);
      }
    } catch (exception) {
      if (request === detailRequest.current) setError(exception.message);
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }, []);
  useEffect(() => {
    if (loading || selected || showHotelForm || !hotels.length) return;
    const request = window.requestAnimationFrame(() => openHotel(hotels[0]));
    return () => window.cancelAnimationFrame(request);
  }, [hotels, loading, openHotel, selected, showHotelForm]);
  const createHotel = () => {
    detailRequest.current += 1;
    setSelected(null);
    setDetailLoading(false);
    setSearch("");
    setEditingHotel(null);
    setHotelForm(emptyHotel);
    setShowHotelForm(true);
  };
  const saveHotel = async (event) => {
    event.preventDefault();
    try {
      let hotel;
      if (editingHotel) {
        await api.hotels.update(editingHotel, hotelForm);
        hotel = { ...selected, ...hotelForm, id: editingHotel };
      } else {
        hotel = await api.hotels.create(hotelForm);
      }
      setHotelForm(emptyHotel);
      setEditingHotel(null);
      await openHotel(hotel);
      await loadHotels();
    } catch (exception) {
      setError(exception.message);
    }
  };
  const editHotel = (hotel) => {
    setEditingHotel(hotel.id);
    setHotelForm({ title: hotel.title, location: hotel.location });
    setShowHotelForm(true);
  };
  const changeHotelStatus = (hotel) => {
    const nextStatus = hotel.status === "archived" ? "active" : "archived";
    const action = nextStatus === "archived" ? "Архивировать" : "Восстановить";
    confirmDelete(`${action} отель «${hotel.title}»?`, async () => {
      try {
        const updated = await api.hotels.setStatus(hotel.id, nextStatus);
        if (selected?.id === hotel.id) {
          setSelected(updated);
        }
        await loadHotels();
      } catch (exception) {
        setError(exception.message);
      }
    });
  };
  const saveRoom = async (event) => {
    event.preventDefault();
    try {
      if (editingRoom)
        await api.rooms.update(selected.id, editingRoom, roomForm);
      else await api.rooms.create(selected.id, roomForm);
      setRoomForm(emptyRoom);
      setEditingRoom(null);
      setShowRoomForm(false);
      await openHotel(selected);
    } catch (exception) {
      setError(exception.message);
    }
  };
  const editRoom = (room) => {
    setEditingRoom(room.id);
    setShowRoomForm(true);
    setRoomForm({
      title: room.title,
      description: room.description,
      price: room.price,
      quantity: room.quantity,
      facilities_ids: room.facilities.map((item) => item.id),
    });
  };
  const createRoom = () => {
    setEditingRoom(null);
    setRoomForm(emptyRoom);
    setShowRoomForm(true);
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
        <h2>Отели и номера</h2>
        <button className="admin-hotel-add-button" type="button" onClick={createHotel}>
          <Plus />
          Добавить отель
        </button>
      </div>
      <ErrorMessage error={error} />
      <div className="admin-hotel-layout">
        <aside className="admin-hotel-catalog" aria-label="Каталог отелей">
          <div className="admin-hotel-catalog-heading">
            <h3>Каталог отелей</h3>
            <label className="admin-hotel-search">
              <Search aria-hidden="true" />
              <input
                aria-label="Поиск отеля"
                placeholder="Поиск по названию…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              className="admin-hotel-status-filter"
              aria-label="Фильтр по статусу отеля"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="archived">Архивные</option>
            </select>
          </div>
          {loading ? (
            <LoadingState />
          ) : hotels.length ? (
            <div className="admin-list">
              {hotels.map((hotel) => (
                <article className={selected?.id === hotel.id ? "selected" : ""} key={hotel.id}>
                  <button
                    className="admin-list-main"
                    type="button"
                    onClick={() => openHotel(hotel)}
                  >
                    <HotelThumbnail hotel={hotel} />
                    <span className="admin-list-copy">
                      <strong>{hotel.title}</strong>
                      <small>{hotel.location}</small>
                      <span className={`admin-hotel-status ${hotel.status}`}>
                        {hotel.status === "archived" ? "Архивирован" : "Активен"}
                      </span>
                    </span>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>Отели не найдены</EmptyState>
          )}
        </aside>
        <div className="admin-hotel-workspace">
          {showHotelForm ? (
            <form className="admin-form admin-hotel-editor" onSubmit={saveHotel}>
              <div className="admin-hotel-editor-heading">
                <div>
                  <h3>{editingHotel ? "Редактирование отеля" : "Новый отель"}</h3>
                  <p>Укажите название и местоположение отеля.</p>
                </div>
                <button
                  type="button"
                  className="admin-icon-action"
                  aria-label="Закрыть форму"
                  onClick={() => setShowHotelForm(false)}
                >
                  <X />
                </button>
              </div>
              <div className="admin-field-grid">
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
              </div>
              <div className="admin-form-actions">
                <button type="submit">
                  Сохранить
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowHotelForm(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : detailLoading ? (
            <LoadingState />
          ) : selected ? (
            <>
              <article className="admin-hotel-summary">
                <div className="admin-hotel-cover">
                  <img
                    src={images[0]?.original_url || hotelFallback}
                    alt={images[0] ? `Отель ${selected.title}` : "Иллюстрация отеля"}
                  />
                  {!images[0] && <span className="admin-hotel-illustration">Иллюстрация · фото не загружено</span>}
                </div>
                <div className="admin-hotel-summary-content">
                  <div>
                    <h3>{selected.title}</h3>
                    <p className="admin-hotel-location"><MapPin aria-hidden="true" />{selected.location}<span>№ {selected.id}</span></p>
                    <span className={`admin-hotel-status ${selected.status}`}>
                      {selected.status === "archived" ? "Архивирован" : "Активен"}
                    </span>
                  </div>
                  <div className="admin-detail-actions">
                    <button className="primary" type="button" onClick={() => editHotel(selected)}>
                      <Pencil aria-hidden="true" />Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => changeHotelStatus(selected)}
                    >
                      {selected.status === "archived" ? <RotateCcw aria-hidden="true" /> : <Archive aria-hidden="true" />}
                      {selected.status === "archived" ? "Восстановить" : "Архивировать"}
                    </button>
                    <label className="admin-upload">
                      <Camera aria-hidden="true" />Добавить фото
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={uploadHotelImage}
                      />
                    </label>
                  </div>
                </div>
              </article>
              {images.length > 0 && (
                <details className="admin-hotel-gallery">
                  <summary><Images aria-hidden="true" />Все фотографии ({images.length})</summary>
                  <div className="admin-image-strip">
                    {images.map((image) => (
                      <figure key={image.id}>
                        <img src={image.original_url} alt={`Фото ${selected.title}`} loading="lazy" />
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
                            aria-label={`Удалить фотографию отеля ${selected.title}`}
                            onClick={() =>
                              confirmDelete("Удалить фотографию?", async () => {
                                try {
                                  await api.images.delete(selected.id, image.id);
                                  await openHotel(selected);
                                } catch (exception) {
                                  setError(exception.message);
                                }
                              })
                            }
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </details>
              )}
              <div className="admin-room-heading">
                <h4>Типы номеров</h4>
                <button type="button" onClick={createRoom}>
                  <Plus />
                  Добавить тип номера
                </button>
              </div>
              {showRoomForm && <form className="admin-form" onSubmit={saveRoom}>
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
                  <fieldset className="admin-facility-fieldset wide">
                    <legend>Удобства</legend>
                    <div className="admin-facility-options">
                      {facilities.map((facility) => (
                        <label key={facility.id}>
                          <input
                            type="checkbox"
                            checked={roomForm.facilities_ids.includes(facility.id)}
                            onChange={(event) =>
                              setRoomForm((current) => ({
                                ...current,
                                facilities_ids: event.target.checked
                                  ? [...current.facilities_ids, facility.id]
                                  : current.facilities_ids.filter((id) => id !== facility.id),
                              }))
                            }
                          />
                          <span>{facility.title}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div className="admin-form-actions">
                  <button type="submit">
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingRoom(null);
                      setRoomForm(emptyRoom);
                      setShowRoomForm(false);
                    }}
                  >
                    <X />
                    Отмена
                  </button>
                </div>
              </form>}
              {rooms.length ? <div className="admin-room-grid">
                {rooms.map((room) => (
                  <article className="admin-room-card" key={room.id}>
                    <img
                      className="admin-room-photo"
                      src={roomIllustration(room.title)}
                      alt={`Иллюстрация типа номера ${room.title}`}
                      loading="lazy"
                    />
                    <div className="admin-room-copy">
                      <div className="admin-room-title-line">
                        <h5>{room.title}</h5>
                        <span>№ {room.id}</span>
                      </div>
                      <p>{room.description}</p>
                      <div className="admin-room-facilities" aria-label="Удобства номера">
                        {room.facilities.map((facility) => (
                          <span key={facility.id}>
                            {facility.image_url ? <img src={facility.image_url} alt="" /> : <Check aria-hidden="true" />}
                            {facility.title}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="admin-room-meta">
                      <strong>{new Intl.NumberFormat("ru-RU").format(room.price)} ₽ <small>/ ночь</small></strong>
                      <span><BedDouble aria-hidden="true" />Номеров: {room.quantity}</span>
                    </div>
                    <div className="admin-room-card-actions">
                      <button type="button" aria-label={`Редактировать ${room.title}`} onClick={() => editRoom(room)}>
                        <Pencil aria-hidden="true" />
                      </button>
                      <button className="danger" type="button" aria-label={`Удалить ${room.title}`} onClick={() => deleteRoom(room)}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div> : <EmptyState>Типы номеров пока не добавлены</EmptyState>}
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
