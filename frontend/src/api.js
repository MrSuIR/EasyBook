const API_ROOT = "/api";

export class ApiError extends Error {
  constructor(status, code, detail) {
    const message = Array.isArray(detail) ? detail.map((item) => item.msg ?? item.detail).filter(Boolean).join(". ") : detail;
    super(message || "Сервис временно недоступен");
    this.status = status;
    this.code = code || "http_error";
  }
}

export function buildQuery(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return params.size ? `?${params}` : "";
}

export async function request(path, { method = "GET", query, body, signal } = {}) {
  const response = await fetch(`${API_ROOT}${path}${buildQuery(query)}`, {
    method,
    credentials: "include",
    signal,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, payload?.code, payload?.detail);
  return payload;
}

export const api = {
  auth: {
    me: (options) => request("/auth/me", options),
    login: (body) => request("/auth/login", { method: "POST", body }),
    register: (body) => request("/auth/register", { method: "POST", body }),
    logout: () => request("/auth/logout", { method: "POST" }),
  },
  hotels: {
    list: (query, options) => request("/hotels", { ...options, query }),
    get: (hotelId, options) => request(`/hotels/${hotelId}`, options),
  },
  rooms: {
    list: (hotelId, query, options) => request(`/hotels/${hotelId}/rooms`, { ...options, query }),
  },
  images: {
    list: (hotelId, options) => request(`/hotels/${hotelId}/images`, options),
  },
  bookings: {
    mine: (options) => request("/bookings/me", options),
    create: (body) => request("/bookings", { method: "POST", body }),
    cancel: (bookingId) => request(`/bookings/${bookingId}/cancel`, { method: "POST" }),
  },
  reviews: {
    list: (hotelId, query, options) => request(`/hotels/${hotelId}/reviews`, { ...options, query }),
  },
  locations: {
    suggest: (q, options) => request("/locations/suggestions", { ...options, query: { q, limit: 6 } }),
  },
};
