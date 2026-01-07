import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaBed } from 'react-icons/fa';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import Layout from '../components/common/Layout';
import Loading from '../components/common/Loading';
import { bookingsApi } from '../api';
import { Booking } from '../types';

const MyBookingsPage = () => {
  const location = useLocation();
  const successMessage = (location.state as any)?.message;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await bookingsApi.getMy();
      setBookings(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Необходимо войти в систему');
      } else {
        setError('Ошибка загрузки бронирований');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Мои бронирования</h1>

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600">У вас пока нет бронирований</p>
          <p className="text-gray-500 mt-2">Найдите идеальный отель на главной странице</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const nights = differenceInDays(
              parseISO(booking.date_to),
              parseISO(booking.date_from)
            );

            return (
              <div key={booking.id} className="card">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {booking.room?.title || `Номер #${booking.room_id}`}
                      </h3>
                      {booking.room?.description && (
                        <p className="text-gray-600 mb-2">{booking.room.description}</p>
                      )}
                    </div>
                    <div className="text-right mt-4 md:mt-0">
                      <div className="text-2xl font-bold text-primary-600">
                        {booking.total_cost}₽
                      </div>
                      <div className="text-sm text-gray-600">
                        {booking.price}₽ × {nights} {nights === 1 ? 'ночь' : 'ночей'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-gray-700">
                      <FaCalendarAlt className="mr-3 text-primary-600" />
                      <div>
                        <div className="text-sm text-gray-600">Заезд</div>
                        <div className="font-semibold">
                          {format(parseISO(booking.date_from), 'dd MMMM yyyy', { locale: ru })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <FaCalendarAlt className="mr-3 text-primary-600" />
                      <div>
                        <div className="text-sm text-gray-600">Выезд</div>
                        <div className="font-semibold">
                          {format(parseISO(booking.date_to), 'dd MMMM yyyy', { locale: ru })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {booking.room?.facilities && booking.room.facilities.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Удобства:</h4>
                      <div className="flex flex-wrap gap-2">
                        {booking.room.facilities.map((facility) => (
                          <span
                            key={facility.id}
                            className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700"
                          >
                            {facility.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default MyBookingsPage;
