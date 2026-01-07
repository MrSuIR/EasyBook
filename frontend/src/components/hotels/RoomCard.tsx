import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBed, FaUsers, FaWifi, FaTv, FaSnowflake, FaParking } from 'react-icons/fa';
import { Room } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface RoomCardProps {
  room: Room;
  hotelId: number;
  searchDates?: {
    date_from: string;
    date_to: string;
  };
}

const facilityIcons: { [key: string]: JSX.Element } = {
  'Wi-Fi': <FaWifi />,
  'TV': <FaTv />,
  'Кондиционер': <FaSnowflake />,
  'Парковка': <FaParking />,
};

const RoomCard = ({ room, hotelId, searchDates }: RoomCardProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleBooking = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/hotels/${hotelId}` } });
      return;
    }
    navigate('/booking', {
      state: {
        room,
        hotelId,
        searchDates,
      },
    });
  };

  return (
    <div className="card">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{room.title}</h3>
            {room.description && (
              <p className="text-gray-600 mb-4">
                {isExpanded ? room.description : `${room.description.slice(0, 100)}...`}
                {room.description.length > 100 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-primary-600 ml-2 hover:underline"
                  >
                    {isExpanded ? 'Свернуть' : 'Читать далее'}
                  </button>
                )}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="text-3xl font-bold text-primary-600">
              {room.price}₽
            </div>
            <div className="text-sm text-gray-600">за ночь</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center text-gray-700 mb-2">
            <FaBed className="mr-2" />
            <span>Доступно: {room.quantity} номеров</span>
          </div>
        </div>

        {room.facilities && room.facilities.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">Удобства:</h4>
            <div className="flex flex-wrap gap-2">
              {room.facilities.map((facility) => (
                <span
                  key={facility.id}
                  className="flex items-center space-x-1 bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700"
                >
                  {facilityIcons[facility.title] || <FaUsers />}
                  <span>{facility.title}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleBooking}
          className="btn-primary w-full"
          disabled={room.quantity === 0}
        >
          {room.quantity === 0 ? 'Нет свободных номеров' : 'Забронировать'}
        </button>
      </div>
    </div>
  );
};

export default RoomCard;
