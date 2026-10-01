from pathlib import Path
import ast
import textwrap
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.top_margin = sec.bottom_margin = Cm(2)
sec.left_margin, sec.right_margin = Cm(3), Cm(1.5)
sec.different_first_page_header_footer = True
for name in ('Normal', 'Title', 'Heading 1', 'Heading 2', 'Caption'):
    style = doc.styles[name]
    style.font.name = 'Times New Roman'
    style.font.color.rgb = RGBColor(0, 0, 0)
    style.font.size = Pt(14)
    style.paragraph_format.space_after = Pt(6)
    style.paragraph_format.line_spacing = 1.5
doc.styles['Normal'].paragraph_format.first_line_indent = Cm(1.25)
for name in ('Title', 'Heading 1', 'Heading 2', 'Caption'):
    doc.styles[name].paragraph_format.first_line_indent = Cm(0)
doc.styles['Title'].font.size = Pt(18)
doc.styles['Heading 1'].font.size = Pt(16)
doc.styles['Heading 1'].font.bold = True
doc.styles['Heading 2'].font.bold = True
doc.styles['Caption'].font.size = Pt(12)
doc.styles['Caption'].font.italic = False
code_style = doc.styles.add_style('Code', 1)
code_style.font.name, code_style.font.size = 'Consolas', Pt(10)
code_style.paragraph_format.line_spacing = 1
code_style.paragraph_format.space_after = Pt(0)
code_style.paragraph_format.first_line_indent = Cm(0)
code_style.paragraph_format.keep_together = True
footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
fld = OxmlElement('w:fldSimple')
fld.set(qn('w:instr'), 'PAGE')
footer._p.append(fld)
doc.core_properties.author = 'Асланов Тимур'
doc.core_properties.title = 'Онлайн-сервис бронирования отелей EasyBook'
doc.core_properties.subject = 'Отчёт о курсовой работе по базам данных'

headings = []
def p(text, style=None):
    para = doc.add_paragraph(text, style)
    if not style:
        para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return para

def h(text, level=1):
    doc.add_heading(text, level)
    if level == 1:
        headings.append(text)

def page(title):
    doc.add_page_break()
    h(title)

def code(text):
    for line in textwrap.dedent(text).strip().splitlines():
        para = p(line or ' ', 'Code')
        para.paragraph_format.keep_with_next = False
    doc.add_paragraph().paragraph_format.space_after = Pt(0)

def table(headers, rows, widths):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    borders = OxmlElement('w:tblBorders')
    for side in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement('w:' + side)
        e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '4'); e.set(qn('w:color'), 'D9D9D9')
        borders.append(e)
    t._tbl.tblPr.append(borders)
    for cells, values, is_header in [(t.rows[0].cells, headers, True)] + [(t.add_row().cells, row, False) for row in rows]:
        for i, (c, value) in enumerate(zip(cells, values)):
            c.width = Cm(widths[i]); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            c.text = value
            pr = c._tc.get_or_add_tcPr()
            margins = OxmlElement('w:tcMar')
            for side in ('top','bottom','left','right'):
                e = OxmlElement('w:'+side); e.set(qn('w:w'),'85'); e.set(qn('w:type'),'dxa'); margins.append(e)
            pr.append(margins)
            if is_header:
                shade = OxmlElement('w:shd'); shade.set(qn('w:fill'), 'E7E6E6'); pr.append(shade)
            for para in c.paragraphs:
                para.paragraph_format.first_line_indent = Cm(0)
                para.paragraph_format.line_spacing = 1.05
                para.paragraph_format.space_after = Pt(2)
                for run in para.runs:
                    run.font.size = Pt(11)
                    run.font.bold = is_header
        cant = OxmlElement('w:cantSplit'); cells[0]._tc.getparent().get_or_add_trPr().append(cant)
    repeat = OxmlElement('w:tblHeader'); t.rows[0]._tr.get_or_add_trPr().append(repeat)
    p('')
    return t

def image(filename, caption, width=12.5):
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.paragraph_format.first_line_indent = Cm(0)
    para.paragraph_format.line_spacing = 1
    para.paragraph_format.keep_with_next = True
    run = para.add_run()
    inline = run.add_picture(str(ROOT/'assets'/filename), width=Cm(width))
    inline._inline.docPr.set('descr', caption)
    para = p(caption, 'Caption'); para.alignment = WD_ALIGN_PARAGRAPH.CENTER

def method(path, name):
    content = (REPO/path).read_text(encoding='utf-8')
    tree = ast.parse(content)
    target = next(n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == name)
    return textwrap.dedent('\n'.join(content.splitlines()[target.lineno-1:target.end_lineno]))

def center(text, size=14, bold=False, before=0, after=0, style=None):
    para = doc.add_paragraph(style=style)
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.paragraph_format.first_line_indent = Cm(0)
    para.paragraph_format.space_before, para.paragraph_format.space_after = Pt(before), Pt(after)
    run = para.add_run(text); run.font.size = Pt(size); run.bold = bold

center('[Полное наименование образовательной организации]', before=15)
center('[Факультет или институт]')
center('[Кафедра]', after=100)
center('ОТЧЁТ О КУРСОВОЙ РАБОТЕ', 18, True, style='Title')
center('по дисциплине «Базы данных»', after=20)
center('Онлайн-сервис бронирования отелей EasyBook', 16, True, after=75)
for line in ('Выполнил: студент группы ПС-31', 'Асланов Тимур', 'Проверил: Лучинин Захар'):
    para = p(line); para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    para.paragraph_format.first_line_indent = Cm(0)
center('[Город] — 2026', before=80)

page('Содержание')
toc_placeholder = doc.add_paragraph()
toc_placeholder.paragraph_format.first_line_indent = Cm(0)

page('Введение')
p('EasyBook — веб-приложение для поиска отелей и бронирования типов номеров на заданные даты. Основой системы служит реляционная база данных PostgreSQL, которая хранит каталог, пользователей, бронирования, отзывы и метаданные изображений. Клиентский интерфейс реализован на React, серверная часть — на FastAPI.')
p('Цель курсовой работы — спроектировать и реализовать базу данных онлайн-сервиса бронирования отелей и приложение для работы с ней. Особое внимание уделено ссылочной целостности, ограничениям данных, разграничению доступа и защите от конкурентного бронирования последнего доступного номера.')
p('Для достижения цели выполнены анализ предметной области, построение модели сущностей и связей, создание схемы с помощью миграций Alembic, разработка API и графического интерфейса, реализация аналитического отчёта по отелям и автоматических проверок бизнес-правил.')
p('Объект исследования — процесс поиска и бронирования гостиничного размещения. Предмет исследования — структура и методы обработки данных каталога, номерного фонда, поездок и отзывов пользователей.')
p('Отчёт содержит описание предметной области, ER-диаграмму, характеристику физической схемы, примеры запросов SQL, пояснения к транзакционной логике и снимки интерфейса приложения. Аналитический отчёт показывает активность бронирований и стоимость подтверждённых ночей по каждому отелю.')
p('Границы проекта: реальные платежи и отправка электронной почты не выполняются. Поля банковской карты демонстрируют этап оформления. Каталог и отзывы демонстрационного наполнения предназначены для проверки сценариев системы.')

page('1 Предметная область и требования')
h('1.1 Участники и основные процессы', 2)
p('В системе участвуют посетитель, зарегистрированный клиент и администратор. Посетитель просматривает каталог, подбирает даты и изучает доступные типы номеров и отзывы. Зарегистрированный клиент оформляет бронирование, просматривает собственные поездки, отменяет будущие брони и публикует отзывы после проживания.')
p('Администратор поддерживает каталог отелей, типы номеров, удобства и изображения, управляет пользователями и просматривает все бронирования и аналитику. Публичная регистрация всегда создаёт пользователя с ролью client. Выдать административные права через публичную форму регистрации нельзя.')
table(['Участник','Доступные действия'], [
('Посетитель','Поиск, просмотр отеля, номеров и публичных отзывов; регистрация и вход'),
('Клиент','Все публичные действия; собственные брони, профиль и отзывы'),
('Администратор','Управление каталогом и пользователями; все брони; аналитика')], [3.4,13.1])
h('1.2 Сценарий бронирования', 2)
p('Пользователь задаёт местоположение, дату заезда и дату выезда, выбирает отель и тип номера. После входа он проходит форму гостя и демонстрационный этап оплаты. Перед показом подтверждения frontend отправляет POST /bookings. Сервер проверяет даты, статус отеля и доступность и только после успешного commit возвращает созданную бронь.')
p('Доступность, показанная при поиске, является результатом проверки на момент запроса. Между поиском и оформлением свободное место может занять другой пользователь, поэтому сервер повторно проверяет наличие места внутри транзакции создания брони.')

page('1.3 Правила и ограничения')
p('Тип номера описывает категорию размещения, например Standard или Suite, и общее число доступных номеров этой категории. Он не представляет отдельную физическую комнату. Поле quantity задаёт положительный лимит, price — неотрицательную стоимость одной ночи.')
p('Дата заезда не может быть раньше текущей даты, дата выезда должна быть позже даты заезда. Проживание задаётся полуоткрытым интервалом [date_from, date_to). Две брони пересекаются, если начало первой раньше конца второй и конец первой позже начала второй. Выезд и следующий заезд в один день допустимы.')
p('Созданная бронь получает статус confirmed. Стоимость ночи копируется из типа номера, поэтому изменение цены в каталоге не изменяет стоимость уже оформленной поездки. Итоговая стоимость вычисляется как сохранённая цена, умноженная на число ночей.')
p('Отмена переводит бронь в cancelled и заполняет cancelled_at; запись сохраняется для истории и аналитики. Подтверждённую бронь можно отменить только до дня заезда. Повторная отмена уже отменённой брони идемпотентна. Отменённые записи не занимают номерной фонд.')
p('Отель имеет статус active или archived. Архивный отель исключается из публичного поиска и не принимает новые бронирования, но остаётся доступным по прямой ссылке. История поездок, отзывы и аналитические показатели сохраняются.')
p('Один отзыв принадлежит одной брони, а у брони может быть не более одного отзыва. Публикация разрешена владельцу подтверждённой брони начиная с даты выезда. Оценка — целое число от 1 до 5; комментарий обязателен и ограничен 2000 символами. Публичный ответ содержит имя автора, но не раскрывает его email, фамилию и идентификаторы пользователя и брони.')
p('Удаление объектов, на которые ссылаются бронирования, запрещено внешними ключами. Уменьшение quantity не допускается ниже пика текущих и будущих пересекающихся подтверждённых броней. Проверки доступа и временных условий выполняет приложение, статические ограничения данных дополнительно закреплены в PostgreSQL.')

page('2 Проектирование базы данных')
h('2.1 ER-диаграмма основных сущностей', 2)
image('er-user.png', 'Рисунок 1 — ER-диаграмма основных сущностей EasyBook', 16)
p('Связи «один ко многим» объединяют пользователей с бронированиями, отели с типами номеров и типы номеров с бронированиями. Связь брони с отзывом имеет кратность 1 к 0..1. Связь типов номеров и удобств «многие ко многим» реализована через rooms_facilities.')

page('2.2 Физическая схема и уточнения модели')
p('В физической схеме используются восемь прикладных таблиц: users, hotels, rooms, bookings, facilities, rooms_facilities, reviews и hotel_images. Alembic дополнительно ведёт служебную таблицу alembic_version для версии миграций.')
p('На диаграмме первичные ключи подписаны user_id, hotel_id и т. д. В действующей базе первичный ключ каждой таблицы называется id; внешние ключи сохраняют имена user_id, hotel_id, room_id, facility_id и booking_id. SQL-примеры далее используют физические имена.')
p('В работающей реализации цена rooms.price и bookings.price имеет тип INTEGER и задаётся в целых рублях. Поэтому обозначение NUMERIC на исходной диаграмме следует понимать как денежное значение концептуальной модели. Поле hotels.status типа VARCHAR(20) добавлено для архивирования. Таблица hotel_images дополняет изображённую модель связью hotels 1 → N hotel_images.')
table(['Связь','Кратность','Реализация'], [
('users → bookings','1 → N','bookings.user_id → users.id'),
('hotels → rooms','1 → N','rooms.hotel_id → hotels.id'),
('rooms → bookings','1 → N','bookings.room_id → rooms.id'),
('bookings → reviews','1 → 0..1','reviews.booking_id; UNIQUE'),
('rooms ↔ facilities','M ↔ N','rooms_facilities; UNIQUE пары'),
('hotels → hotel_images','1 → N','hotel_images.hotel_id → hotels.id')], [4.5,2.5,9.5])
p('Модель разделяет сведения о пользователях, отелях и категориях номеров, избегая повторения их реквизитов в каждой брони. Список удобств хранится отдельными строками связи. Копия цены в брони введена намеренно: это историческое значение сделки бронирования, а не повтор текущей цены каталога.')
p('total_cost не является столбцом таблицы bookings. Значение рассчитывается в Pydantic-схеме ответа. Файлы изображений лежат в локальном хранилище, а база сохраняет только UUID, привязку к отелю и путь к проверенному оригиналу.')

page('2.3 Пользователи отели и типы номеров')
table(['Таблица и поле','Тип','Назначение и ограничения'], [
('users.id','INTEGER','Первичный ключ'),
('users.email','VARCHAR(320)','Уникальный нормализованный email'),
('users.first_name','VARCHAR(100)','Имя, непустое, 1–100 символов'),
('users.last_name','VARCHAR(100)','Фамилия, непустая, 1–100 символов'),
('users.hashed_password','VARCHAR','Хеш пароля'),
('users.role','VARCHAR(20)','client или admin'),
('hotels.id','INTEGER','Первичный ключ'),
('hotels.title','VARCHAR(100)','Непустое название отеля'),
('hotels.location','VARCHAR(500)','Непустое местоположение'),
('hotels.status','VARCHAR(20)','active или archived'),
('rooms.id','INTEGER','Первичный ключ типа номера'),
('rooms.hotel_id','INTEGER','Внешний ключ hotels.id; RESTRICT'),
('rooms.title','VARCHAR(200)','Непустое название категории'),
('rooms.description','VARCHAR(500)','Обязательное непустое описание'),
('rooms.price','INTEGER','Стоимость ночи ≥ 0'),
('rooms.quantity','INTEGER','Количество номеров > 0')], [5.2,3.4,7.9])
p('Все поля этих трёх таблиц обязательны. Email хранится в нижнем регистре без пробелов по краям. Хеш пароля не возвращается публичным API. Номер с hotel_id, которого нет в hotels, создать нельзя.')

page('2.4 Бронирования и отзывы')
table(['Таблица и поле','Тип','Назначение и ограничения'], [
('bookings.id','INTEGER','Первичный ключ'),
('bookings.room_id','INTEGER','Внешний ключ rooms.id; RESTRICT'),
('bookings.user_id','INTEGER','Внешний ключ users.id; RESTRICT'),
('bookings.date_from','DATE','Дата заезда'),
('bookings.date_to','DATE','Дата выезда; позже заезда'),
('bookings.price','INTEGER','Сохранённая цена ночи ≥ 0'),
('bookings.status','VARCHAR(20)','confirmed или cancelled'),
('bookings.created_at','TIMESTAMPTZ','Время создания; по умолчанию now()'),
('bookings.cancelled_at','TIMESTAMPTZ','Время отмены; допускает NULL'),
('reviews.id','INTEGER','Первичный ключ'),
('reviews.booking_id','INTEGER','Внешний ключ bookings.id; UNIQUE'),
('reviews.rating','INTEGER','Оценка от 1 до 5'),
('reviews.comment','VARCHAR(2000)','Непустой текст 1–2000 символов'),
('reviews.created_at','TIMESTAMPTZ','Время создания отзыва'),
('reviews.updated_at','TIMESTAMPTZ','Время последнего изменения')], [5.2,3.4,7.9])
p('Кроме cancelled_at все перечисленные поля обязательны. Ограничение UNIQUE(reviews.booking_id) исключает два отзыва одной брони даже при одновременных запросах. Время updated_at обновляется через SQLAlchemy при изменении отзыва; пользовательский триггер для этого не создаётся.')
p('Индексы bookings(room_id, status, date_from, date_to) и bookings(user_id) поддерживают проверку пересечений и выборку поездок пользователя. rooms(hotel_id) ускоряет получение категорий конкретного отеля.')

page('2.5 Удобства изображения и целостность')
table(['Таблица и поле','Тип','Назначение и ограничения'], [
('facilities.id','INTEGER','Первичный ключ'),
('facilities.title','VARCHAR(100)','Непустое название удобства'),
('facilities.image_path','VARCHAR(500)','Путь иконки; допускает NULL'),
('rooms_facilities.id','INTEGER','Первичный ключ строки связи'),
('rooms_facilities.room_id','INTEGER','Внешний ключ rooms.id; CASCADE'),
('rooms_facilities.facility_id','INTEGER','Внешний ключ facilities.id; CASCADE'),
('hotel_images.id','UUID','Первичный ключ изображения'),
('hotel_images.hotel_id','INTEGER','Внешний ключ hotels.id; CASCADE'),
('hotel_images.original_path','VARCHAR(500)','Путь к оригинальному файлу'),
('hotel_images.created_at','TIMESTAMPTZ','Время создания записи')], [5.5,3.2,7.8])
p('В rooms_facilities действует UNIQUE(room_id, facility_id). При удалении типа номера или удобства связанные строки этой таблицы удаляются каскадно. При удалении отеля удаляются его метаданные изображений, но сам отель нельзя удалить, пока на него ссылаются типы номеров.')
p('CHECK-ограничения фиксируют диапазоны цены, количества и оценки, порядок дат, допустимые роли и статусы. Для названий, описаний и комментариев контролируются длина и наличие непробельных символов. NOT NULL предотвращает отсутствие обязательных значений. Проверка начала поездки относительно текущего дня выполняется приложением при создании брони.')
p('Схема развивается только через Alembic. Миграции перед добавлением ограничений проверяют существующие записи и останавливаются при нарушениях вместо молчаливого исправления данных. Это позволяет сохранять данные при последовательном обновлении базы.')
p('Приложение принимает JPEG, PNG и WebP до 5 МБ и проверяет фактическое содержимое через Pillow. Иконки удобств должны иметь размер 38×38 пикселей. Файлы получают UUID-имена. При замене старый оригинал удаляется после успешного commit, а при ошибке БД новый файл удаляется.')

SQL = {}
SQL['catalog'] = '''SELECT h.id, h.title, h.location, MIN(r.price) AS price_from
FROM hotels AS h
JOIN rooms AS r ON r.hotel_id = h.id
WHERE h.status = 'active'
  AND h.location = 'Москва, Россия'
GROUP BY h.id, h.title, h.location
ORDER BY h.title ASC, h.id ASC
LIMIT 9 OFFSET 0;'''
SQL['availability'] = '''SELECT r.id, r.title, r.description, r.price,
       r.quantity - COUNT(b.id) AS available_quantity
FROM rooms AS r
JOIN hotels AS h ON h.id = r.hotel_id
LEFT JOIN bookings AS b ON b.room_id = r.id
  AND b.status = 'confirmed'
  AND b.date_from < DATE '2026-10-05'
  AND b.date_to > DATE '2026-10-02'
WHERE h.id = (SELECT MIN(id) FROM hotels
              WHERE status = 'active')
  AND h.status = 'active'
GROUP BY r.id
HAVING r.quantity > COUNT(b.id)
ORDER BY r.price, r.id;'''
SQL['history'] = '''SELECT b.id, h.title AS hotel, r.title AS room_type,
       b.date_from, b.date_to, b.status, b.price,
       b.price * (b.date_to - b.date_from) AS total_cost
FROM bookings AS b
JOIN rooms AS r ON r.id = b.room_id
JOIN hotels AS h ON h.id = r.hotel_id
WHERE b.user_id = (SELECT id FROM users
                  WHERE email = 'client@example.com')
ORDER BY b.date_from DESC, b.id DESC
LIMIT 10;'''
SQL['facilities'] = '''SELECT r.id, r.title,
       STRING_AGG(f.title, ', ' ORDER BY f.title) AS facilities
FROM rooms AS r
LEFT JOIN rooms_facilities AS rf ON rf.room_id = r.id
LEFT JOIN facilities AS f ON f.id = rf.facility_id
GROUP BY r.id
ORDER BY r.id
LIMIT 10;'''
SQL['reviews'] = '''SELECT rv.id, rv.rating, rv.comment, rv.created_at,
       u.first_name AS author_first_name
FROM reviews AS rv
JOIN bookings AS b ON b.id = rv.booking_id
JOIN rooms AS r ON r.id = b.room_id
JOIN users AS u ON u.id = b.user_id
WHERE r.hotel_id = (SELECT MIN(id) FROM hotels
                    WHERE status = 'active')
ORDER BY rv.created_at DESC, rv.id DESC
LIMIT 10 OFFSET 0;'''
SQL['analytics'] = '''WITH period AS (
  SELECT DATE '2025-10-01' AS d1,
         DATE '2026-10-02' AS d2
), booking_metrics AS (
  SELECT r.hotel_id,
    COUNT(*) FILTER (WHERE b.status = 'confirmed') AS confirmed,
    COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
    SUM(CASE WHEN b.status = 'confirmed' THEN
      LEAST(b.date_to, p.d2) - GREATEST(b.date_from, p.d1)
      ELSE 0 END) AS nights,
    SUM(CASE WHEN b.status = 'confirmed' THEN b.price *
      (LEAST(b.date_to, p.d2) - GREATEST(b.date_from, p.d1))
      ELSE 0 END) AS revenue
  FROM bookings AS b
  JOIN rooms AS r ON r.id = b.room_id
  CROSS JOIN period AS p
  WHERE b.date_from < p.d2 AND b.date_to > p.d1
  GROUP BY r.hotel_id
), review_metrics AS (
  SELECT r.hotel_id, ROUND(AVG(rv.rating), 2) AS rating
  FROM reviews AS rv
  JOIN bookings AS b ON b.id = rv.booking_id
  JOIN rooms AS r ON r.id = b.room_id
  CROSS JOIN period AS p
  WHERE b.status = 'confirmed'
    AND b.date_to >= p.d1 AND b.date_to < p.d2
  GROUP BY r.hotel_id
)
SELECT h.id AS hotel_id, h.title AS hotel_title,
  COALESCE(bm.confirmed, 0) AS confirmed_bookings,
  COALESCE(bm.cancelled, 0) AS cancelled_bookings,
  COALESCE(bm.nights, 0) AS booked_nights,
  COALESCE(bm.revenue, 0) AS booked_revenue,
  rm.rating AS average_rating,
  COALESCE(ROUND(100.0 * bm.cancelled /
    NULLIF(bm.confirmed + bm.cancelled, 0), 2), 0)
    AS cancellation_rate
FROM hotels AS h
LEFT JOIN booking_metrics AS bm ON bm.hotel_id = h.id
LEFT JOIN review_metrics AS rm ON rm.hotel_id = h.id
ORDER BY booked_revenue DESC, h.id DESC
LIMIT 20 OFFSET 0;'''

page('3 Примеры запросов SQL')
p('Приведённые запросы выражают операции приложения на языке PostgreSQL. В backend эти операции формируются SQLAlchemy и выполняются с параметрами. Конкретные даты и местоположение в листингах выбраны для демонстрации; идентификаторы объектов выбираются из существующей базы.')
h('3.1 Каталог активных отелей', 2)
code(SQL['catalog'])
p('Запрос соединяет отели с типами номеров, исключает архивные записи и определяет минимальную цену ночи. GROUP BY даёт одну строку на отель. LIMIT и OFFSET задают страницу результата. Это пример каталога без проверки дат; проверка доступности приведена далее.')
h('3.2 Доступность на даты проживания', 2)
code(SQL['availability'])
p('LEFT JOIN учитывает только подтверждённые брони, пересекающие выбранный интервал. COUNT(b.id) остаётся равным нулю для свободной категории. HAVING оставляет категории, у которых число таких броней меньше quantity.')

page('3.3 История бронирований и удобства')
code(SQL['history'])
p('Соединение bookings, rooms и hotels позволяет показать поездку вместе с названием отеля и категории. Итоговая стоимость вычисляется по цене из bookings. В рабочем API user_id берётся из авторизованной сессии, а не из произвольного параметра клиента.')
code(SQL['facilities'])
p('Таблица rooms_facilities реализует связь «многие ко многим». STRING_AGG объединяет названия удобств в строку для представления. LEFT JOIN сохраняет в результате типы номеров без удобств, для которых агрегат возвращает NULL.')
h('3.4 Публичные отзывы отеля', 2)
code(SQL['reviews'])
p('Привязка отзыва к отелю определяется через бронь и тип номера. В проекции присутствует только имя автора. Идентификаторы брони и пользователя, фамилия и email в публичный результат не включаются.')

page('3.5 SQL аналитического отчёта')
p('Агрегаты бронирований и отзывов рассчитываются отдельно, чтобы соединение не умножало строки и не завышало стоимость и число ночей. Период задан как [2025-10-01, 2026-10-02). Следующий листинг соответствует правилам отчёта с фильтром по периоду.')
parts = SQL['analytics'].split('SELECT h.id AS hotel_id')
code(parts[0])
p('Для брони берётся только пересечение дат с периодом. Для рейтинга отбираются отзывы броней, выезд которых попал в период. Дата создания самого отзыва не служит фильтром этого показателя.')

page('3.5 SQL аналитического отчёта продолжение')
code('SELECT h.id AS hotel_id' + parts[1])
p('Внешние соединения с hotels сохраняют отели без активности. COALESCE преобразует отсутствующие количественные показатели в нули. NULLIF предотвращает деление на ноль при вычислении доли отмен. Средняя оценка при отсутствии отзывов остаётся NULL.')
h('3.6 Ограничения на уровне схемы', 2)
code('''-- Фрагмент определения ограничений таблицы bookings
CONSTRAINT ck_bookings_date_order
  CHECK (date_from < date_to),
CONSTRAINT ck_bookings_price_nonnegative
  CHECK (price >= 0),
CONSTRAINT ck_bookings_status
  CHECK (status IN ('confirmed', 'cancelled'))

-- Ограничения остальных таблиц
UNIQUE (email)                     -- users
UNIQUE (booking_id)                -- reviews
UNIQUE (room_id, facility_id)       -- rooms_facilities
CHECK (rating BETWEEN 1 AND 5)      -- reviews
CHECK (price >= 0)                 -- rooms
CHECK (quantity > 0)               -- rooms''')
p('Этот листинг показывает фрагменты DDL, уже закреплённые моделями и миграциями. Их не следует выполнять как самостоятельный SQL-скрипт: изменение существующей схемы производится только миграциями Alembic.')

page('4 Транзакции функции и процедуры')
p('Пользовательские хранимые процедуры, функции PostgreSQL и триггеры в проекте не определены. Для статической целостности используются CHECK, UNIQUE, NOT NULL и FOREIGN KEY. Бизнес-операции выполняются асинхронными функциями Python с явным commit. Ниже приведены тексты реально используемых функций и пояснения к ним.')
h('4.1 Граница транзакции создания брони', 2)
code(method('src/service/bookings.py', 'add_booking'))
p('BookingService.add_booking формирует внутреннюю схему с идентификатором пользователя из сессии, вызывает репозиторий и подтверждает транзакцию. Для всех действий используются общая сессия SQLAlchemy и менеджер БД. При исключении менеджер выполняет rollback.')
h('4.2 Проверка доступности и блокировки', 2)
p('BookingsRepository.add_booking сначала блокирует строку отеля и проверяет active. Эта блокировка согласует создание брони с архивированием. Затем блокируется тип номера через SELECT FOR UPDATE. До завершения транзакции другие операции, запрашивающие ту же строку, ожидают освобождения блокировки.')
p('После получения блокировки репозиторий считает пересекающиеся confirmed-брони. Если лимит исчерпан, выбрасывается доменное исключение, преобразуемое API в 409 room_unavailable. При наличии места создаётся запись с ценой заблокированного типа номера. Полный текст метода приведён на следующих страницах.')
p('Проверка и вставка не разделяются на независимые транзакции. Иначе два параллельных запроса могли бы одновременно увидеть свободное место и оформить две брони. В PostgreSQL с обычным уровнем READ COMMITTED последующий запрос подсчёта видит запись предыдущей завершённой транзакции.')

page('4.2 Метод создания брони блокировки')
booking_method = method('src/repositories/bookings.py', 'add_booking')
method_parts = booking_method.split('    booking_is_confirmed')
code(method_parts[0])
p('Запрос отеля использует FOR UPDATE OF hotels, чтобы согласовать создание брони с изменением его статуса. Отсутствие отеля по привязке номера трактуется как отсутствие номера. Архивный отель даёт 409 hotel_archived.')
p('Второй запрос блокирует rooms. Операции создания брони, отмены и изменения количества номеров используют блокировку типа номера, поэтому проверка доступности и корректировка лимита не выполняются независимо друг от друга.')

page('4.2 Метод создания брони проверка и вставка')
code(textwrap.dedent('    booking_is_confirmed'+method_parts[1]))
p('Условие пересечения использует строгие неравенства, поэтому смежные интервалы допустимы. В подсчёт входят только confirmed-брони. Для создания записи используется room.price, а передача клиентом цены и user_id в публичный контракт не требуется.')
p('В этом алгоритме считаются все подтверждённые брони, пересекающие запрошенный интервал. Для длительного интервала такой критерий может быть консервативнее расчёта пика занятости по отдельным датам. Он соответствует текущей реализации и не допускает превышения установленного количества.')

page('4.3 Отзывы и сохранение истории')
code(method('src/service/reviews.py','add_review'))
p('Функция блокирует бронь, проверяет владельца, статус confirmed и завершение проживания. Уникальное ограничение reviews.booking_id защищает от дублирования. После успешной вставки выполняется commit. Конкурирующие создание отзыва, его удаление и отмена используют блокировку той же брони.')
p('При отмене сначала блокируются бронь и тип номера. Для уже отменённой брони возвращается текущее состояние без повторного изменения. Затем проверяется отсутствие отзыва и условие текущая дата < date_from. UPDATE меняет status и cancelled_at; физического удаления истории не происходит.')
p('Для уменьшения quantity репозиторий вычисляет максимальную одновременную занятость по событиям заезда и выезда текущих и будущих confirmed-броней. События одной даты объединяются, что сохраняет полуоткрытую семантику. Если новый лимит ниже этого пика, изменение отклоняется с 409 room_quantity_below_bookings.')

page('5 Архитектура приложения')
p('Приложение имеет три основных компонента: React-интерфейс, FastAPI API и PostgreSQL 16. В Docker Compose frontend обслуживается Nginx и обращается к API через прокси; сервер работает с PostgreSQL через асинхронный SQLAlchemy 2. Серверный код использует Python 3.13 и Pydantic 2, клиентский — React 19, JavaScript/JSX, Vite 6 и CSS.')
table(['Уровень','Назначение'], [
('src/api','HTTP-маршруты, зависимости сессии, проверка доступа'),
('src/service','Бизнес-правила и завершение транзакций'),
('src/repositories','SQLAlchemy-запросы и блокировки строк'),
('src/models и src/schemas','ORM-схема и Pydantic-контракты'),
('src/migrations','Версионирование физической схемы Alembic'),
('frontend/src','Страницы React, компоненты, API-клиент и стили')], [5.5,11])
p('Авторизация использует JWT в cookie с HttpOnly, Secure и SameSite=Lax. Клиент передаёт cookie через credentials: include. Пароли хранятся в виде хешей. API проверяет роль и принадлежность объекта при каждом защищённом действии.')
p('Ошибки имеют общий формат {code, detail}. Отсутствие авторизации возвращает 401, недостаток прав — 403, отсутствие объекта — 404, конфликт доступности или целостности — 409, некорректные входные данные — 400 или 422. Глобальные обработчики находятся в src/main.py.')
p('Списки отелей, административных бронирований, публичных отзывов и аналитика имеют пагинацию {items, total, page, per_page} и сортировку с дополнительным стабильным порядком по идентификатору. Отчёт аналитики доступен только администратору.')
p('Глобальные подсказки городов запрашиваются сервером у Geoapify. Ключ провайдера не передаётся frontend. При недоступности подсказок API возвращает 503 location_provider_unavailable. Изображения сохраняются локально; их проверка и файловые операции выполняются в worker thread.')

page('6 Графический интерфейс')
h('6.1 Главная страница и вход', 2)
p('Главная страница объединяет поиск по местоположению и датам, каталог отелей, направления поездок и карусель публичных отзывов. Пользовательские страницы поддерживают светлую и тёмную темы. Ниже приведён вид главной страницы в тёмной теме.')
image('home.jpg','Рисунок 2 — Главная страница EasyBook',12)
p('Форма входа принимает email и пароль, создаёт сессию и возвращает пользователя к приложению. Отдельная страница регистрации запрашивает имя и фамилию. При ошибках интерфейс выводит сообщение backend и не подставляет вымышленные отели, цены или отзывы.')

page('6.2 Страница отеля')
p('Страница отеля показывает местоположение, галерею фотографий, описание выбранного типа номера и удобства. Можно изменить даты, выбрать категорию и перейти к оформлению. Ниже страницы доступны отзывы с именем автора, оценкой и датой.')
image('hotel.jpg','Рисунок 3 — Карточка отеля и галерея фотографий',12)
p('Цена и доступные категории загружаются из API. Фотографии демонстрационного каталога служат для представления интерфейса и могут изображать другой отель того же региона. Статические фотографии типов номеров являются иллюстрациями.')

page('6.3 Оформление бронирования')
p('Оформление состоит из данных гостя, демонстрационного этапа оплаты и подтверждения. Бронь создаётся на сервере перед экраном успешного завершения. При конфликте доступности пользователь получает ошибку и может изменить выбор.')
image('booking.jpg','Рисунок 4 — Первый этап оформления бронирования',12)
p('Имя, фамилия, контактные и платёжные поля этой формы являются состоянием интерфейса. POST /bookings отправляет только room_id, date_from и date_to. Владелец определяется по сессии, цена — по данным БД. Отдельная таблица гостей или платежей в проекте отсутствует.')

page('6.4 Личный кабинет')
p('Личный кабинет показывает брони текущего пользователя и разделяет предстоящие, завершённые и отменённые поездки. Карточка содержит даты, число ночей, сохранённую цену и итоговую стоимость, а также переход к отелю.')
image('account.jpg','Рисунок 5 — Предстоящие поездки в личном кабинете',12)
p('Будущую бронь можно отменить через API. Для завершённой подтверждённой поездки доступно создание отзыва; опубликованные отзывы можно редактировать и удалять. Сервер проверяет права независимо от состояния кнопок интерфейса.')

page('6.5 Административная панель')
p('Административная панель объединяет обзор, каталог отелей и типов номеров, удобства, бронирования, пользователей и аналитику. Создание и редактирование одной сущности выполняются общей формой. Изображения загружаются и заменяются через защищённые API-маршруты.')
image('admin.jpg','Рисунок 6 — Обзор административной панели',12)
p('Обзор показывает число отелей, бронирований и пользователей, агрегированную стоимость подтверждённых поездок и готовность API / БД. Индикатор состояния обращается к /health/ready и проверяет доступность PostgreSQL. Показатели вычисляются по текущим данным.')

page('7 Аналитический отчёт по отелям')
p('Отчёт GET /analytics/hotels возвращает одну строку на существующий отель, включая архивные отели и отели без активности. В интерфейсе задаются начало и конец периода, показатель сортировки и направление порядка; результат отображается постранично.')
image('analytics.jpg','Рисунок 7 — Аналитика по отелям с фильтром периода',12)
p('Период характеризует даты проживания, а не даты создания записей. date_from и date_to передаются вместе. При их отсутствии отчёт охватывает всю историю; будущий период допустим. Конец периода не включается.')

page('7.1 Показатели и интерпретация отчёта')
table(['Показатель','Правило расчёта'], [
('confirmed_bookings','Число confirmed-броней, пересекающих период'),
('cancelled_bookings','Число cancelled-броней, пересекающих период'),
('booked_nights','Сумма ночей confirmed-броней внутри периода'),
('booked_revenue','Сумма сохранённой цены × ночи внутри периода'),
('average_rating','Средняя оценка отзывов броней с выездом в периоде'),
('cancellation_rate','Отменено / (подтверждено + отменено) × 100')], [5.3,11.2])
p('Каждая пересекающая период бронь учитывается один раз в счётчиках. Ночи и стоимость рассчитываются только для confirmed. Средняя оценка и доля отмен округляются до двух знаков. При отсутствии броней доля отмен равна нулю; при отсутствии отзывов оценка равна NULL.')
p('Пример: бронь с 28 сентября по 3 октября стоимостью 4000 рублей за ночь пересекает период [1 октября, 3 октября). В отчёт попадают две ночи и 8000 рублей, хотя полная поездка длится пять ночей. В счётчик подтверждений она попадает один раз. Выезд 3 октября не входит в этот период для отбора рейтинга.')
p('На показанном снимке за период [2025-10-01, 2026-10-02) для «Арт Отель Казань» отображаются одна подтверждённая бронь, шесть ночей, 80 100 рублей, оценка 5 и нулевая доля отмен. Это пример данных локального каталога, а не сведения о реальных продажах отеля.')
p('Название «выручка» в интерфейсе обозначает стоимость подтверждённых ночей по сохранённым ценам. Система не проверяет оплату и не ведёт бухгалтерский учёт. Отчёт формируется запросом к текущим таблицам; отдельное хранилище аналитики и экспорт в файл не реализованы.')

page('8 Запуск и проверка проекта')
h('8.1 Воспроизводимый запуск',2)
p('Для запуска требуются Docker Desktop и Docker Compose. Из .env.example создаётся локальный .env, после чего выполняется команда из корня репозитория:')
code('docker compose up --build')
p('API применяет миграции и в режиме LOCAL создаёт демонстрационный каталог. PostgreSQL использует именованный volume для данных; изображения из src/static/images монтируются в API-контейнер. Frontend запускается после успешной проверки готовности API.')
table(['Ресурс','Адрес'], [('Приложение','http://localhost:3000'),('API','http://localhost:8000'),('Swagger','http://localhost:8000/docs'),('Готовность API и БД','http://localhost:8000/health/ready')], [6,10.5])
h('8.2 Автоматические проверки',2)
p('Модульные тесты работают без PostgreSQL. Интеграционные тесты создают временную PostgreSQL через Testcontainers и проверяют HTTP API, ограничения схемы, приватность и конкурентные операции. В тесте десяти параллельных запросов на единственный номер ожидается ровно один ответ 201 и девять ответов 409.')
p('При подготовке отчёта проверка Ruff для src и tests завершилась без замечаний, а модульные тесты завершились результатом 18 passed. Структура таблиц и отсутствие пользовательских триггеров дополнительно сверены с запущенной PostgreSQL. Снимки получены из работающего локального приложения.')
p('В репозитории предусмотрены также Pyright, полный pytest, frontend-тесты, lint и сборка Vite. Они проверяют отдельные уровни проекта; приведённый выше результат относится к фактически запущенным при подготовке отчёта проверкам.')

page('Заключение')
p('В курсовой работе разработан онлайн-сервис бронирования отелей EasyBook. Построена реляционная схема из восьми прикладных таблиц, отражающая пользователей, каталог, типы номеров, удобства, бронирования, отзывы и изображения. Связи, уникальность, обязательность и диапазоны данных закреплены в PostgreSQL и дополнены проверками Pydantic.')
p('Реализованы публичный поиск, регистрация и авторизация, оформление и отмена бронирований, личный кабинет и отзывы после проживания. Административный интерфейс позволяет управлять каталогом и пользователями, просматривать брони и аналитический отчёт по отелям.')
p('Транзакционные блокировки согласуют проверку доступности и вставку брони, предотвращая превышение количества номеров при параллельных запросах. Архивирование отелей и отмена бронирований сохраняют историю. Копирование цены при создании фиксирует стоимость поездки независимо от последующих изменений каталога.')
p('Аналитика вычисляет подтверждения, отмены, ночи, стоимость подтверждённых ночей, среднюю оценку и долю отмен за выбранный период. Отдельные агрегаты и внешние соединения позволяют избежать дублирования показателей и включить отели без активности.')
p('Docker Compose, миграции Alembic и локальный демонстрационный каталог обеспечивают воспроизводимое развёртывание. Проект демонстрирует проектирование базы данных, транзакции, целостность и разграничение ролей. Реальные платежи и email-рассылка находятся за пределами реализованной функциональности.')
h('Материалы проекта',2)
p('1. README.md — архитектура, модель данных, API и запуск.\n2. src/models и src/migrations/versions — физическая схема и история её изменения.\n3. src/service и src/repositories — бизнес-операции, блокировки и аналитика.\n4. frontend/src — графический интерфейс.\n5. tests/unit_tests и tests/integration_tests — автоматические проверки.')

# Static content outline is updated with verified page numbers after rendering.
for title in headings[1:]:
    para = doc.add_paragraph() if False else None
toc_placeholder.text = '\n'.join(title for title in headings[1:])
toc_placeholder.paragraph_format.line_spacing = 1.25
toc_placeholder.runs[0].font.size = Pt(12)
doc.save(ROOT/'EasyBook_report.docx')
(ROOT/'sql_examples.sql').write_text('-- Проверенные примеры SELECT для PostgreSQL\nBEGIN READ ONLY;\n' + '\n\n'.join('-- '+name+'\n'+query for name,query in SQL.items()) + '\nROLLBACK;\n', encoding='utf-8')
print(f'Saved {ROOT / "EasyBook_report.docx"}')
