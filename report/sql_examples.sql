-- Проверенные примеры SELECT для PostgreSQL
BEGIN READ ONLY;
-- catalog
SELECT h.id, h.title, h.location, MIN(r.price) AS price_from
FROM hotels AS h
JOIN rooms AS r ON r.hotel_id = h.id
WHERE h.status = 'active'
  AND h.location = 'Москва, Россия'
GROUP BY h.id, h.title, h.location
ORDER BY h.title ASC, h.id ASC
LIMIT 9 OFFSET 0;

-- availability
SELECT r.id, r.title, r.description, r.price,
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
ORDER BY r.price, r.id;

-- history
SELECT b.id, h.title AS hotel, r.title AS room_type,
       b.date_from, b.date_to, b.status, b.price,
       b.price * (b.date_to - b.date_from) AS total_cost
FROM bookings AS b
JOIN rooms AS r ON r.id = b.room_id
JOIN hotels AS h ON h.id = r.hotel_id
WHERE b.user_id = (SELECT id FROM users
                  WHERE email = 'client@example.com')
ORDER BY b.date_from DESC, b.id DESC
LIMIT 10;

-- facilities
SELECT r.id, r.title,
       STRING_AGG(f.title, ', ' ORDER BY f.title) AS facilities
FROM rooms AS r
LEFT JOIN rooms_facilities AS rf ON rf.room_id = r.id
LEFT JOIN facilities AS f ON f.id = rf.facility_id
GROUP BY r.id
ORDER BY r.id
LIMIT 10;

-- reviews
SELECT rv.id, rv.rating, rv.comment, rv.created_at,
       u.first_name AS author_first_name
FROM reviews AS rv
JOIN bookings AS b ON b.id = rv.booking_id
JOIN rooms AS r ON r.id = b.room_id
JOIN users AS u ON u.id = b.user_id
WHERE r.hotel_id = (SELECT MIN(id) FROM hotels
                    WHERE status = 'active')
ORDER BY rv.created_at DESC, rv.id DESC
LIMIT 10 OFFSET 0;

-- analytics
WITH period AS (
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
LIMIT 20 OFFSET 0;
ROLLBACK;
