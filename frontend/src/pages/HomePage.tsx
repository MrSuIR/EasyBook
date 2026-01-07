import { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import Layout from '../components/common/Layout';
import HotelCard from '../components/hotels/HotelCard';
import Loading from '../components/common/Loading';
import { hotelsApi } from '../api';
import { Hotel } from '../types';

const HomePage = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search filters
  const [location, setLocation] = useState('');
  const [title, setTitle] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchHotels = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (location) params.location = location;
      if (title) params.title = title;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await hotelsApi.getAll(params);
      setHotels(data);
    } catch (err: any) {
      setError('Ошибка загрузки отелей');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHotels();
  };

  const handleReset = () => {
    setLocation('');
    setTitle('');
    setDateFrom('');
    setDateTo('');
    setTimeout(() => fetchHotels(), 0);
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Найдите идеальный отель</h1>
        <p className="text-gray-600">Бронируйте отели по лучшим ценам</p>
      </div>

      {/* Search Form */}
      <div className="card mb-8">
        <form onSubmit={handleSearch} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Город или отель
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Москва, Санкт-Петербург..."
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Локация
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Центр, Аэропорт..."
                className="input-field"
              />
            </div>
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
          </div>
          <div className="flex space-x-4">
            <button type="submit" className="btn-primary flex items-center space-x-2">
              <FaSearch />
              <span>Найти</span>
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary">
              Сбросить
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600">Отелей не найдено</p>
          <p className="text-gray-500 mt-2">Попробуйте изменить параметры поиска</p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Найдено отелей: {hotels.length}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        </>
      )}
    </Layout>
  );
};

export default HomePage;
