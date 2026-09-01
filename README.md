# EasyBook — онлайн-сервис бронирования отелей

EasyBook — курсовой проект по базам данных с React-интерфейсом и FastAPI API.
Пользователи могут искать и бронировать номера, управлять поездками и оставлять
отзывы. Администраторы управляют каталогом, пользователями и аналитикой.

## Возможности

- JWT-аутентификация через HttpOnly cookie и роли `client`/`admin`;
- поиск отелей по местоположению и датам;
- защищённое от конкурентных запросов бронирование;
- отмена бронирований без удаления истории;
- отзывы после завершённого проживания;
- управление отелями, типами номеров, удобствами и изображениями;
- аналитика по отелям с фильтрацией, сортировкой и пагинацией;
- светлая и тёмная темы;
- PostgreSQL, Alembic и воспроизводимый запуск через Docker Compose.

## Архитектура

```mermaid
flowchart LR
    C["Клиент"] --> W["React / Nginx"]
    W --> A["FastAPI"]
    D["Swagger"] --> A
    A --> S["Сервисы и транзакции"]
    S --> R["Репозитории SQLAlchemy"]
    R --> P[(PostgreSQL)]
    S --> F["Локальное хранилище изображений"]
```

Backend разделён на HTTP-маршруты, сервисы, репозитории, схемы и ORM-модели.
Frontend состоит из страниц, общих компонентов, API-клиента и отдельных файлов
стилей. Изображения хранятся в `src/static/images`, их метаданные — в PostgreSQL.

## Модель данных

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : creates
    HOTELS ||--o{ ROOMS : contains
    ROOMS ||--o{ BOOKINGS : reserved_as
    BOOKINGS ||--o| REVIEWS : receives
    ROOMS ||--o{ ROOMS_FACILITIES : has
    FACILITIES ||--o{ ROOMS_FACILITIES : assigned
    HOTELS ||--o{ HOTEL_IMAGES : owns

    USERS {
        int id PK
        string email UK
        string first_name
        string last_name
        string hashed_password
        string role
    }
    HOTELS {
        int id PK
        string title
        string location
    }
    ROOMS {
        int id PK
        int hotel_id FK
        string description
        int price
        int quantity
    }
    BOOKINGS {
        int id PK
        int room_id FK
        int user_id FK
        date date_from
        date date_to
        int price
        string status
    }
    REVIEWS {
        int id PK
        int booking_id FK, UK
        int rating
        string comment
        datetime created_at
        datetime updated_at
    }
    FACILITIES {
        int id PK
        string title
        string image_path "nullable"
    }
    HOTEL_IMAGES {
        uuid id PK
        int hotel_id FK
        string original_path
        datetime created_at
    }
```

Основные ограничения продублированы в Pydantic и PostgreSQL: цена неотрицательна,
количество номеров положительно, даты бронирования образуют корректный интервал,
email и связь отзыва с бронью уникальны.

## Защита от овербукинга

Бронирования используют полуоткрытые интервалы `[date_from, date_to)`. При
создании брони тип номера блокируется через `SELECT ... FOR UPDATE`, после чего в
той же транзакции проверяется число пересекающихся подтверждённых броней. Поэтому
при десяти параллельных запросах на последний номер успешным будет только один.

## Быстрый запуск

```bash
cp .env.example .env
docker compose up --build
```

После запуска:

- frontend: `http://localhost:3000`;
- API: `http://localhost:8000`;
- Swagger: `http://localhost:8000/docs`.

Compose по умолчанию использует `MODE=LOCAL`, применяет миграции и создаёт
демонстрационный каталог. Для подсказок городов добавьте в `.env` ключ
`GEOAPIFY_API_KEY`. В `MODE=PROD` нужен случайный `JWT_SECRET_KEY` длиной не
менее 32 символов, а cookie всегда получает флаг `Secure`.

### Демонстрационные данные

Повторно наполнить локальную базу можно командой:

```bash
docker compose exec api python -m src.cli seed-demo
```

Демонстрационные учётные записи:

- `admin@example.com` / `12345678`;
- `client@example.com` / `12345678`;
- `traveler@example.com` / `12345678`.

Seed доступен только в режимах `LOCAL`, `DEV` и `TEST`, работает идемпотентно и
не удаляет пользовательские записи.

## Локальная разработка

Backend использует Python 3.13:

```bash
python -m pip install -r requirements-dev.txt
alembic upgrade head
uvicorn src.main:app
```

Frontend использует Node.js 22 и pnpm:

```bash
cd frontend
pnpm install
pnpm dev
```

Vite запускается на `http://localhost:5173` и проксирует `/api` и `/static` на
FastAPI.

## Основные endpoint-ы

| Метод и путь | Доступ | Назначение |
|---|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/logout` | все | регистрация и сессия |
| `GET/PUT /auth/me` | пользователь | профиль текущего пользователя |
| `GET /hotels` | все | поиск и пагинация отелей |
| `GET /hotels/{id}/rooms` | все | доступные типы номеров |
| `GET /locations/suggestions` | все | подсказки городов через Geoapify |
| `POST /bookings` | пользователь | создание бронирования |
| `GET /bookings/me` | пользователь | собственные бронирования |
| `POST /bookings/{id}/cancel` | владелец/admin | отмена бронирования |
| `GET/POST/PATCH/DELETE /reviews...` | пользователь | управление отзывами |
| `GET /hotels/{id}/reviews` | все | публичные отзывы отеля |
| `GET /analytics/hotels` | admin | аналитика по отелям |
| mutations `/hotels`, `/rooms`, `/facilities`, `/users` | admin | управление данными |
| routes `/hotels/{id}/images`, `/facilities/{id}/image` | admin | управление изображениями |

Пагинированные списки имеют формат `{items, total, page, per_page}`. Ошибки API
возвращаются единообразно:

```json
{"code": "machine_readable_code", "detail": "Описание ошибки"}
```

## Проверки

```bash
ruff check .
pyright
pytest
docker compose config --quiet
cd frontend
pnpm test
pnpm lint
pnpm build
```

Интеграционные тесты используют Testcontainers и требуют запущенный Docker
Desktop. CI дополнительно собирает Compose-проект и проверяет готовность API и БД.

## Границы проекта

Проект не выполняет реальные платежи и не отправляет email. Платёжная форма в
сценарии бронирования демонстрационная. Изображения сохраняются как проверенные
оригиналы без фоновой обработки и создания миниатюр.
