# EasyBook — онлайн-сервис бронирования отелей

EasyBook — полнофункциональный курсовой проект по базам данных с современным
React-интерфейсом. Система хранит каталог отелей, типов номеров и удобств,
позволяет клиентам искать и бронировать номера, а администраторам — управлять
каталогом и видеть все бронирования.

## Возможности

- регистрация и cookie-аутентификация по JWT;
- роли `client` и `admin`;
- поиск доступных отелей и номеров по датам;
- защищённое от параллельных запросов бронирование;
- отмена без удаления истории;
- отзывы владельцев после завершения подтверждённого проживания;
- безопасная загрузка изображений JPEG/PNG/WebP до 5 МБ;
- адаптивный frontend на React 19, Vite 6 и Tailwind CSS 4;
- PostgreSQL и Alembic;
- Swagger по адресу `/docs`, healthcheck-и `/health/live` и `/health/ready`.

## Архитектура

```mermaid
flowchart LR
    C["Клиент"] --> W["React frontend / Nginx"]
    W --> A["FastAPI: API и зависимости"]
    D["Swagger"] --> A
    A --> S["Сервисы: бизнес-правила"]
    S --> R["Репозитории: запросы SQLAlchemy"]
    R --> P[(PostgreSQL)]
    S --> F["Хранилище оригиналов изображений"]
```

Frontend отвечает за клиентский сценарий поиска, выбора номера, авторизации и
бронирования. API отвечает за HTTP-контракт и права, сервисы — за
бизнес-правила и транзакции, репозитории — за работу с БД. Оригиналы
изображений хранятся в отдельном каталоге, а их метаданные — в PostgreSQL.

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

    USERS { int id PK string email UK string hashed_password string role }
    HOTELS { int id PK string title string location }
    ROOMS { int id PK int hotel_id FK int price int quantity }
    BOOKINGS { int id PK int room_id FK int user_id FK date date_from date date_to int price string status }
    REVIEWS { int id PK int booking_id FK_UK int rating string comment datetime created_at datetime updated_at }
    FACILITIES { int id PK string title }
    HOTEL_IMAGES { uuid id PK int hotel_id FK string original_path datetime created_at }
```

Ключевые ограничения БД: `price >= 0`, `quantity > 0`,
`date_from < date_to`, `rating BETWEEN 1 AND 5`, один отзыв на бронь и
уникальная пара удобства и номера. Удаление отеля,
номера или пользователя с бронями запрещено (`409`), связи удобств удаляются
каскадно.

Отзыв создаёт только владелец подтверждённой брони начиная с даты выезда.
Комментарий обязателен и содержит не более 2000 символов. Отзыв можно изменять
и удалять; после удаления для той же брони его можно создать снова. Бронь с
существующим отзывом отменить нельзя.

## Защита от овербукинга

Интервалы полуоткрытые: `[date_from, date_to)`, поэтому выезд и следующий
заезд в один день совместимы. Создание брони выполняется одной транзакцией:

1. строка типа номера блокируется `SELECT ... FOR UPDATE`;
2. считаются пересекающиеся брони со статусом `confirmed`;
3. результат сравнивается с `rooms.quantity`;
4. бронь создаётся либо возвращается `409 room_unavailable`.

Конкурентные запросы к одному типу номера сериализуются этой блокировкой. Это
исключает ситуацию, когда два клиента одновременно увидели последний номер
свободным. Цена копируется в бронь и не меняется при последующем обновлении
каталога.

## Запуск через Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Compose запускает PostgreSQL, API и frontend. Пользовательский интерфейс
доступен на `http://localhost:3000`, API — на `http://localhost:8000`, Swagger —
на `http://localhost:8000/docs`. Миграции
выполняются перед стартом Uvicorn; при ошибке контейнер API останавливается.

Создание или повышение администратора (команда идемпотентна):

```bash
docker compose exec api python -m src.cli create-admin --email admin@example.com
```

Для быстрого локального наполнения БД после применения миграций выполните:

```bash
docker compose exec api python -m src.cli seed-demo
```

Если API-контейнер был создан до появления команды, сначала пересоберите его:

```bash
docker compose up -d --build api
```

В контейнере должен быть установлен `MODE=LOCAL` или `MODE=DEV`. Для разового
локального запуска без пересоздания контейнера режим можно явно передать только
CLI-процессу:

```bash
docker compose exec -e MODE=LOCAL api python -m src.cli seed-demo
```

Команда идемпотентна и создаёт 100 отелей в разных городах, 300 типов номеров,
12 удобств, 300 броней с разными сценариями и 120 отзывов. Тестовые учётные
записи:

- `admin@example.com` / `12345678` — администратор;
- `client@example.com` / `12345678` — клиент;
- `traveler@example.com` / `12345678` — клиент.

При повторном запуске записи не дублируются. Команда предназначена только для
`LOCAL`, `DEV` и `TEST` и отказывается работать при `MODE=PROD`.

### Локальная разработка frontend

Для отдельного запуска интерфейса нужен Node.js 22 и pnpm:

```bash
cd frontend
pnpm install
pnpm dev
```

Vite публикует приложение на `http://localhost:5173` и проксирует `/api` и
`/static` на локальный FastAPI по адресу `http://localhost:8000`. Перед
завершением frontend-изменений выполняйте:

```bash
pnpm test
pnpm lint
pnpm build
```

Frontend — одностраничное React-приложение с URL-маршрутами для главной,
серверной выдачи отелей, страницы отеля, личного кабинета и административной
панели. Клиентская роль управляет своими бронями и отзывами. Администратор
управляет отелями, номерами, удобствами и изображениями, а также просматривает
все бронирования. Единый API-клиент находится в `frontend/src/api.js`; он
поддерживает JSON, `multipart/form-data`, cookie-сессию и общий формат ошибок.
Интерфейс не подставляет демонстрационные отели, номера, цены или рейтинги при
пустом ответе либо ошибке backend.

Для локальной разработки установите зависимости и примените миграции:

```bash
python -m pip install -r requirements-dev.txt
alembic upgrade head
uvicorn src.main:app
```

## Основные endpoint-ы

| Метод и путь | Доступ | Назначение |
|---|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/logout` | все | учётная запись и сессия |
| `GET /auth/me` | пользователь | ID, email и роль |
| `GET /hotels` | все | доступные отели, пагинация |
| mutations `/hotels`, `/hotels/{id}/rooms`, `/facilities` | admin | управление каталогом, включая изменение удобств |
| `POST /bookings` | пользователь | создать бронь |
| `GET /bookings/me` | пользователь | свои брони |
| `GET /bookings/{id}` | владелец/admin | одна бронь |
| `POST /bookings/{id}/cancel` | владелец/admin | идемпотентная отмена |
| `GET /bookings` | admin | все брони, пагинация |
| `POST /reviews` | владелец брони | создать отзыв после даты выезда |
| `GET /reviews/me`, `GET/PATCH/DELETE /reviews/{id}` | владелец | свои отзывы |
| `GET /hotels/{id}/reviews` | все | публичные отзывы, пагинация |
| `POST/PUT/DELETE /hotels/{id}/images/...` | admin | загрузка, замена и удаление изображений |

Списки отелей, административных броней и публичных отзывов имеют вид
`{"items": [], "total": 0, "page": 1, "per_page": 10}`.

Эти три списка поддерживают параметры `sort_by` и `sort_order=asc|desc`:

- отели: `sort_by=id|title|location`, по умолчанию `id asc`;
- бронирования: `sort_by=id|date_from|date_to|price|status`, по умолчанию `id asc`;
- отзывы: `sort_by=created_at|rating`, по умолчанию `created_at desc`.

Если значения основного поля совпадают, порядок стабилизируется по `id` в том
же направлении. Каждый параметр можно передавать отдельно; неизвестные значения
возвращают `422`.

## Ошибки

Ошибки бизнес-логики имеют единый формат
`{"code": "machine_readable_code", "detail": "Описание"}`.

| HTTP | Значение |
|---|---|
| `400/422` | некорректные даты или входные данные |
| `401` | токен отсутствует, повреждён или истёк |
| `403` | недостаточно прав |
| `404` | объект отсутствует |
| `409` | номер занят, отзыв недоступен или нарушена целостность данных |
| `413` | изображение больше 5 МБ |
| `429` | превышен лимит регистрации/входа |

Для отзывов используются коды `review_already_exists`, `review_not_allowed`,
`booking_has_review` и `review_not_found`.

## Тесты и миграции

Обычный запуск `pytest` автоматически создаёт временный PostgreSQL-контейнер;
unit-тесты не требуют БД. Нужен работающий Docker:

```bash
ruff check .
pyright
pytest
alembic check
```

Интеграционные тесты проверяют права, JWT, ограничения БД, соседние интервалы,
10 параллельных броней, конкурентное создание отзывов, отмену, приватность и
валидацию изображений. Для
проверки истории миграций используются `alembic upgrade head` и
`alembic downgrade base` на отдельной БД.

## Границы проекта

В курсовую входят frontend, backend и БД. Платежи и настоящая email-рассылка не
реализуются. Для изображений сохраняются проверенный оригинал
и его метаданные; создание миниатюр и другая фоновая обработка не выполняются.
