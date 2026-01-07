const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">EasyBook</h3>
            <p className="text-gray-400">
              Простой и удобный сервис для бронирования отелей
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Ссылки</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  О нас
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Контакты
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Условия использования
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Контакты</h4>
            <p className="text-gray-400">
              Email: support@easybook.com
              <br />
              Телефон: +7 (123) 456-78-90
            </p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
          <p>&copy; 2026 EasyBook. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
