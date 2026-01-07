import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaArrowLeft } from 'react-icons/fa';
import Layout from '../components/common/Layout';
import RoomCard from '../components/hotels/RoomCard';
import Loading from '../components/common/Loading';
import { hotelsApi, roomsApi } from '../api';
import { Hotel, Room } from '../types';

const HotelDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchHotelData = async () => {
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      const [hotelData, roomsData] = await Promise.all([
        hotelsApi.getById(parseInt(id)),
        roomsApi.getByHotel(parseInt(id), {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      ]);

      setHotel(hotelData);
      setRooms(roomsData);
    } catch (err: any) {
      setError('Ошибка загрузки данных отеля');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotelData();
  }, [id]);

  const handleSearch = () => {
    fetchHotelData();
  };

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  if (error || !hotel) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Отель не найден'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 mb-6 transition-colors"
      >
        <FaArrowLeft />
        <span>Назад</span>
      </button>

      {/* Hotel Header */}
      <div className="card mb-8">
        <div className="h-64 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
          <span className="text-white text-9xl">🏨</span>
        </div>
        <div className="p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{hotel.title}</h1>
          <div className="flex items-center text-xl text-gray-600">
            <FaMapMarkerAlt className="mr-2" />
            <span>{hotel.location}</span>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card mb-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Выберите даты проживания</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Дата заезда
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Дата выезда
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex items-end">
              <button onClick={handleSearch} className="btn-primary w-full">
                Проверить доступность
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rooms */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Доступные номера {rooms.length > 0 && `(${rooms.length})`}
        </h2>

        {rooms.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-xl text-gray-600">Нет доступных номеров</p>
            <p className="text-gray-500 mt-2">
              {dateFrom && dateTo
                ? 'Попробуйте выбрать другие даты'
                : 'Выберите даты для проверки доступности'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                hotelId={hotel.id}
                searchDates={
                  dateFrom && dateTo
                    ? { date_from: dateFrom, date_to: dateTo }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HotelDetailPage;
