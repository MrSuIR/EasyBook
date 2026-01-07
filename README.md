# EasyBook - Hotel Booking System

Современная система бронирования отелей с полнофункциональным бэкендом на FastAPI и красивым фронтендом на React + TypeScript.

## 🚀 Возможности

### Бэкенд (FastAPI)
- ✅ JWT аутентификация с cookie
- ✅ CRUD операции для отелей, номеров и бронирований
- ✅ Фильтрация отелей и номеров по датам доступности
- ✅ Управление удобствами номеров (many-to-many)
- ✅ Загрузка и обработка изображений (Celery)
- ✅ Redis кэширование
- ✅ PostgreSQL база данных
- ✅ Alembic миграции
- ✅ Полное покрытие тестами

### Фронтенд (React + TypeScript)
- ✅ Современный UI с Tailwind CSS
- ✅ Поиск отелей с фильтрами
- ✅ Детальная информация об отелях и номерах
- ✅ Система бронирования
- ✅ Личный кабинет с историей бронирований
- ✅ Защищенные маршруты
- ✅ Адаптивный дизайн

## 📋 Требования

- Python 3.13+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

## 🛠️ Установка и запуск

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd EasyBook
```

### 2. Настройка бэкенда

```bash
# Создать виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Установить зависимости
pip install -r requirements.txt

# Настроить переменные окружения
cp .env.example .env
# Отредактировать .env файл с вашими настройками

# Запустить миграции
alembic upgrade head

# Запустить Redis (в отдельном терминале)
redis-server

# Запустить Celery worker (в отдельном терминале)
celery -A src.tasks.celery_app:celery_app worker --loglevel=info

# Запустить бэкенд
python -m src.main
```

Бэкенд будет доступен по адресу: http://localhost:8000
API документация (Swagger): http://localhost:8000/docs

### 3. Настройка фронтенда

```bash
# Перейти в директорию фронтенда
cd frontend

# Установить зависимости
npm install

# Запустить dev сервер
npm run dev
```

Фронтенд будет доступен по адресу: http://localhost:5173

## 📁 Структура проекта

```
EasyBook/
├── src/                      # Бэкенд (FastAPI)
│   ├── api/                  # API endpoints
│   │   ├── auth.py          # Аутентификация
│   │   ├── hotels.py        # Отели
│   │   ├── rooms.py         # Номера
│   │   ├── bookings.py      # Бронирования
│   │   ├── facilities.py    # Удобства
│   │   └── images.py        # Изображения
│   ├── models/              # ORM модели
│   ├── schemas/             # Pydantic схемы
│   ├── repositories/        # Репозитории (data layer)
│   ├── service/             # Бизнес-логика
│   ├── tasks/               # Celery задачи
│   ├── migrations/          # Alembic миграции
│   ├── static/              # Статические файлы
│   └── main.py              # Точка входа
│
├── frontend/                # Фронтенд (React + TypeScript)
│   ├── src/
│   │   ├── api/            # API клиенты
│   │   ├── components/     # React компоненты
│   │   │   ├── common/    # Общие компоненты
│   │   │   ├── auth/      # Компоненты аутентификации
│   │   │   ├── hotels/    # Компоненты отелей
│   │   │   └── bookings/  # Компоненты бронирований
│   │   ├── pages/         # Страницы
│   │   ├── store/         # State management (Zustand)
│   │   ├── types/         # TypeScript типы
│   │   └── utils/         # Утилиты
│   └── public/
│
├── tests/                   # Тесты
│   ├── unit_tests/
│   └── integration_tests/
│
├── requirements.txt
├── package.json
└── README.md
```

## 🔧 API Endpoints

### Аутентификация
- `POST /auth/register` - Регистрация пользователя
- `POST /auth/login` - Вход
- `GET /auth/me` - Получить текущего пользователя
- `POST /auth/logout` - Выход

### Отели
- `GET /hotels` - Список отелей (с фильтрами)
- `GET /hotels/{id}` - Детали отеля
- `POST /hotels` - Создать отель
- `PUT /hotels/{id}` - Обновить отель
- `PATCH /hotels/{id}` - Частично обновить отель
- `DELETE /hotels/{id}` - Удалить отель

### Номера
- `GET /hotels/{hotel_id}/rooms` - Список номеров отеля
- `GET /hotels/{hotel_id}/rooms/{id}` - Детали номера
- `POST /hotels/{hotel_id}/rooms` - Создать номер
- `PUT /hotels/{hotel_id}/rooms/{id}` - Обновить номер
- `PATCH /hotels/{hotel_id}/rooms/{id}` - Частично обновить номер
- `DELETE /hotels/{hotel_id}/rooms/{id}` - Удалить номер

### Бронирования
- `GET /bookings` - Все бронирования
- `GET /bookings/me` - Мои бронирования
- `POST /bookings` - Создать бронирование

### Удобства
- `GET /facilities` - Список удобств
- `POST /facilities` - Создать удобство

### Изображения
- `POST /images` - Загрузить изображение

## 🎨 Технологический стек

### Бэкенд
- **FastAPI** - Веб-фреймворк
- **SQLAlchemy 2.0** - ORM
- **PostgreSQL** - База данных
- **Redis** - Кэширование
- **Celery** - Асинхронные задачи
- **Alembic** - Миграции БД
- **JWT** - Аутентификация
- **Pydantic** - Валидация данных
- **Pytest** - Тестирование

### Фронтенд
- **React 18** - UI библиотека
- **TypeScript** - Типизация
- **Vite** - Сборщик
- **Tailwind CSS** - Стили
- **React Router** - Маршрутизация
- **Zustand** - State management
- **Axios** - HTTP клиент
- **React Query** - Управление серверным состоянием
- **React Hook Form** - Формы
- **date-fns** - Работа с датами

## 🧪 Тестирование

### Бэкенд тесты
```bash
# Запустить все тесты
pytest

# Запустить с покрытием
pytest --cov=src

# Запустить конкретный тест
pytest tests/integration_tests/auth/test_api.py
```

## 📝 Переменные окружения

### Бэкенд (.env)
```env
MODE=LOCAL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=easybook

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Фронтенд (.env)
```env
VITE_API_URL=http://localhost:8000
```

## 🚀 Production Deployment

### Сборка фронтенда
```bash
cd frontend
npm run build
```

Статические файлы будут в `frontend/dist/`

### Запуск бэкенда в production
```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## 📄 Лицензия

MIT

## 👥 Авторы

EasyBook Team

## 🤝 Вклад

Pull requests приветствуются! Для серьезных изменений, пожалуйста, сначала откройте issue для обсуждения.

## 📞 Поддержка

Если у вас есть вопросы или проблемы, создайте issue в GitHub.
