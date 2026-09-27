const API_ROOT = "/api";

export class ApiError extends Error {
  constructor(status, code, detail) {
    const message = Array.isArray(detail)
      ? detail
          .map((item) => item.msg ?? item.detail)
          .filter(Boolean)
          .join(". ")
      : detail;
    super(message || "Сервис временно недоступен");
    this.status = status;
    this.code = code || "http_error";
  }
}

export function buildQuery(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  });
  return params.size ? `?${params}` : "";
}

export async function request(
  path,
  { method = "GET", query, body, signal } = {},
) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(`${API_ROOT}${path}${buildQuery(query)}`, {
    method,
    credentials: "include",
    signal,
    headers:
      body === undefined || isFormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(response.status, payload?.code, payload?.detail);
  return payload;
}

export const api = {
  auth: {
    me: (options) => request("/auth/me", options),
    login: (body) => request("/auth/login", { method: "POST", body }),
    register: (body) => request("/auth/register", { method: "POST", body }),
    logout: () => request("/auth/logout", { method: "POST" }),
    updateProfile: (body) => request("/auth/me", { method: "PUT", body }),
  },
  hotels: {
    list: (query, options) => request("/hotels", { ...options, query }),
    get: (hotelId, options) => request(`/hotels/${hotelId}`, options),
    adminList: (query, options) =>
      request("/hotels/admin", { ...options, query }),
    create: (body) => request("/hotels", { method: "POST", body }),
    update: (hotelId, body) =>
      request(`/hotels/${hotelId}`, { method: "PUT", body }),
    delete: (hotelId) => request(`/hotels/${hotelId}`, { method: "DELETE" }),
    setStatus: (hotelId, status) =>
      request(`/hotels/${hotelId}/status`, { method: "PATCH", body: { status } }),
  },
  rooms: {
    list: (hotelId, query, options) =>
      request(`/hotels/${hotelId}/rooms`, { ...options, query }),
    adminList: (hotelId, options) =>
      request(`/hotels/${hotelId}/rooms/admin`, options),
    create: (hotelId, body) =>
      request(`/hotels/${hotelId}/rooms`, { method: "POST", body }),
    update: (hotelId, roomId, body) =>
      request(`/hotels/${hotelId}/rooms/${roomId}`, { method: "PUT", body }),
    delete: (hotelId, roomId) =>
      request(`/hotels/${hotelId}/rooms/${roomId}`, { method: "DELETE" }),
  },
  images: {
    list: (hotelId, options) => request(`/hotels/${hotelId}/images`, options),
    upload: (hotelId, file) => {
      const body = new FormData();
      body.append("file", file);
      return request(`/hotels/${hotelId}/images`, { method: "POST", body });
    },
    replace: (hotelId, imageId, file) => {
      const body = new FormData();
      body.append("file", file);
      return request(`/hotels/${hotelId}/images/${imageId}`, {
        method: "PUT",
        body,
      });
    },
    delete: (hotelId, imageId) =>
      request(`/hotels/${hotelId}/images/${imageId}`, { method: "DELETE" }),
  },
  bookings: {
    mine: (options) => request("/bookings/me", options),
    create: (body) => request("/bookings", { method: "POST", body }),
    cancel: (bookingId) =>
      request(`/bookings/${bookingId}/cancel`, { method: "POST" }),
    list: (query, options) => request("/bookings", { ...options, query }),
  },
  reviews: {
    list: (hotelId, query, options) =>
      request(`/hotels/${hotelId}/reviews`, { ...options, query }),
    mine: (options) => request("/reviews/me", options),
    create: (body) => request("/reviews", { method: "POST", body }),
    update: (reviewId, body) =>
      request(`/reviews/${reviewId}`, { method: "PATCH", body }),
    delete: (reviewId) => request(`/reviews/${reviewId}`, { method: "DELETE" }),
  },
  facilities: {
    list: (options) => request("/facilities", options),
    create: (body) => request("/facilities", { method: "POST", body }),
    update: (facilityId, body) =>
      request(`/facilities/${facilityId}`, { method: "PUT", body }),
    delete: (facilityId) =>
      request(`/facilities/${facilityId}`, { method: "DELETE" }),
    uploadImage: (facilityId, file) => {
      const body = new FormData();
      body.append("file", file);
      return request(`/facilities/${facilityId}/image`, {
        method: "PUT",
        body,
      });
    },
    deleteImage: (facilityId) =>
      request(`/facilities/${facilityId}/image`, { method: "DELETE" }),
  },
  users: {
    list: (query, options) => request("/users", { ...options, query }),
    create: (body) => request("/users", { method: "POST", body }),
    update: (userId, body) =>
      request(`/users/${userId}`, { method: "PUT", body }),
    delete: (userId) => request(`/users/${userId}`, { method: "DELETE" }),
  },
  analytics: {
    hotels: (query, options) =>
      request("/analytics/hotels", { ...options, query }),
  },
  health: {
    live: (options) => request("/health/live", options),
    ready: (options) => request("/health/ready", options),
  },
  locations: {
    suggest: (q, options) =>
      request("/locations/suggestions", { ...options, query: { q, limit: 6 } }),
  },
};
