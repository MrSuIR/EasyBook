export const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export const shortDate = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const dateTime = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatCurrency(value) {
  return currency.format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  return shortDate.format(new Date(normalized));
}

export function formatDateTime(value) {
  return value ? dateTime.format(new Date(value)) : "—";
}

export function localDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nightsBetween(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return 0;
  const from = Date.parse(`${dateFrom}T12:00:00Z`);
  const to = Date.parse(`${dateTo}T12:00:00Z`);
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

export function searchDefaults(input = {}) {
  return {
    location: input.location || "",
    title: input.title || "",
    date_from: input.date_from || localDate(7),
    date_to: input.date_to || localDate(9),
    guests: Math.max(1, Number(input.guests) || 2),
    rooms: Math.max(1, Number(input.rooms) || 1),
  };
}

export function paramsToObject(search = window.location.search) {
  return Object.fromEntries(new URLSearchParams(search));
}

export function buildPath(pathname, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

export function plural(value, one, few, many) {
  const number = Math.abs(Number(value));
  const mod100 = number % 100;
  const mod10 = number % 10;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function apiMessage(error, fallback = "Не удалось выполнить запрос.") {
  if (!error) return fallback;
  if (Array.isArray(error.detail)) {
    return error.detail.map((item) => item.msg || item.message).filter(Boolean).join(". ") || fallback;
  }
  return error.message || fallback;
}

export function averageRating(reviews = []) {
  if (!reviews.length) return null;
  return reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length;
}

export function ratingLabel(value) {
  if (value == null) return "Нет оценок";
  if (value >= 4.7) return "Великолепно";
  if (value >= 4.3) return "Отлично";
  if (value >= 3.8) return "Очень хорошо";
  return "Хорошо";
}

export function imageUrl(image) {
  return image?.original_url || null;
}
