import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaCalendarAlt } from 'react-icons/fa';
import { differenceInDays, parseISO } from 'date-fns';
import Layout from '../components/common/Layout';
import { bookingsApi } from '../api';
import { Room } from '../types';

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { room, hotelId, searchDates } = location.state as {
    room: Room;
    hotelId: number;
    searchDates?: { date_from: string; date_to: string };
  };

  const [dateFrom, setDateFrom] = useState(searchDates?.date_from || '');
  const [dateTo, setDateTo] = useState(searchDates?.date_to || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nights = dateFrom && dateTo ? differenceInDays(parseISO(dateTo), parseISO(dateFrom)) : 0;
  const totalCost = nights * room.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dateFrom || !dateTo) {
      setError('Пожалуйста, выберите даты');
      return;
    }

    if (nights <= 0) {
      setError('Дата выезда должна быть позже даты заезда');
      return;
    }

    setLoading(true);

    try {
      await bookingsApi.create({
        room_id: room.id,
        date_from: dateFrom,
        date_to: dateTo,
      });

      // Success! Navigate to bookings page
      navigate('/my-bookings', {
        state: { message: 'Бронирование успешно создано!' },
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка создания бронирования');
      setLoading(false);
    }
  };

  if (!room) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Ошибка: данные номера не найдены
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

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Оформление бронирования</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Выберите даты</h2>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Дата заезда
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Дата выезда
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  {nights > 0 && (
                    <div className="bg-primary-50 p-4 rounded-lg mb-6">
                      <div className="flex items-center text-primary-800">
                        <FaCalendarAlt className="mr-2" />
                        <span className="font-semibold">
                          Количество ночей: {nights}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || nights <= 0}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Бронирование...' : 'Забронировать'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Детали заказа</h3>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{room.title}</h4>
                  {room.description && (
                    <p className="text-sm text-gray-600 mb-2">{room.description}</p>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Цена за ночь:</span>
                    <span className="font-semibold">{room.price}₽</span>
                  </div>

                  {nights > 0 && (
                    <>
                      <div className="flex justify-between text-gray-700">
                        <span>Количество ночей:</span>
                        <span className="font-semibold">{nights}</span>
                      </div>

                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between text-lg font-bold text-gray-900">
                          <span>Итого:</span>
                          <span className="text-primary-600">{totalCost}₽</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {room.facilities && room.facilities.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Удобства:</h4>
                    <ul className="space-y-2">
                      {room.facilities.map((facility) => (
                        <li key={facility.id} className="flex items-center text-sm text-gray-600">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                          {facility.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BookingPage;
