import { Link, useNavigate } from 'react-router-dom';
import { FaHotel, FaUser, FaSignOutAlt, FaCalendarAlt } from 'react-icons/fa';
import { useAuthStore } from '../../store/authStore';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-2xl font-bold text-primary-600">
            <FaHotel className="text-3xl" />
            <span>EasyBook</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-primary-600 transition-colors">
              Отели
            </Link>
            {isAuthenticated && (
              <Link to="/my-bookings" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                <FaCalendarAlt />
                <span>Мои бронирования</span>
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-2 text-gray-700">
                  <FaUser />
                  <span className="hidden md:inline">{user?.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                >
                  <FaSignOutAlt />
                  <span className="hidden md:inline">Выйти</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Войти
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
