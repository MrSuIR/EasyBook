const API_PREFIX = '/api';
const FALLBACK_ERROR_DETAIL = 'Сервис временно недоступен.';

const formatErrorDetail = (detail) => {
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg ?? item?.detail ?? String(item))
      .filter(Boolean)
      .join('. ');
  }
  if (typeof detail === 'string') return detail;
  if (detail == null) return FALLBACK_ERROR_DETAIL;
  try {
    return JSON.stringify(detail);
  } catch {
    return FALLBACK_ERROR_DETAIL;
  }
};

export class ApiError extends Error {
  constructor(status, code, detail) {
    super(formatErrorDetail(detail));
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? 'http_error';
    this.detail = detail ?? FALLBACK_ERROR_DETAIL;
  }
}

const queryValue = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value);

export const buildQuery = (query = {}) => {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query ?? {})) {
    if (rawValue == null) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value != null) params.append(key, queryValue(value));
    }
  }
  const result = params.toString();
  return result ? `?${result}` : '';
};

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const request = async (
  path,
  { method = 'GET', query, body, headers: customHeaders, signal } = {},
) => {
  const headers = new Headers(customHeaders);
  const hasBody = body !== undefined;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_PREFIX}${path}${buildQuery(query)}`, {
    method,
    credentials: 'include',
    headers,
    signal,
    ...(hasBody ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  if (response.status === 204) return null;
  const payload = await readJson(response);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.code,
      payload?.detail ?? FALLBACK_ERROR_DETAIL,
    );
  }
  return payload;
};

const get = (path, query, options) =>
  request(path, { ...options, method: 'GET', query });
const send = (method, path, body, options) =>
  request(path, { ...options, method, body });
const remove = (path, options) => request(path, { ...options, method: 'DELETE' });
const id = (value) => encodeURIComponent(String(value));

const imageFormData = (fileOrFormData) => {
  if (fileOrFormData instanceof FormData) return fileOrFormData;
  const formData = new FormData();
  formData.append('file', fileOrFormData?.file ?? fileOrFormData);
  return formData;
};

export const api = {
  auth: {
    register: (data, options) => send('POST', '/auth/register', data, options),
    login: (data, options) => send('POST', '/auth/login', data, options),
    me: (options) => get('/auth/me', undefined, options),
    logout: (options) => send('POST', '/auth/logout', undefined, options),
  },
  hotels: {
    list: (query, options) => get('/hotels', query, options),
    get: (hotelId, options) => get(`/hotels/${id(hotelId)}`, undefined, options),
    create: (data, options) => send('POST', '/hotels', data, options),
    replace: (hotelId, data, options) =>
      send('PUT', `/hotels/${id(hotelId)}`, data, options),
    update: (hotelId, data, options) =>
      send('PATCH', `/hotels/${id(hotelId)}`, data, options),
    remove: (hotelId, options) => remove(`/hotels/${id(hotelId)}`, options),
  },
  rooms: {
    list: (hotelId, query, options) =>
      get(`/hotels/${id(hotelId)}/rooms`, query, options),
    get: (hotelId, roomId, options) =>
      get(`/hotels/${id(hotelId)}/rooms/${id(roomId)}`, undefined, options),
    create: (hotelId, data, options) =>
      send('POST', `/hotels/${id(hotelId)}/rooms`, data, options),
    replace: (hotelId, roomId, data, options) =>
      send('PUT', `/hotels/${id(hotelId)}/rooms/${id(roomId)}`, data, options),
    update: (hotelId, roomId, data, options) =>
      send('PATCH', `/hotels/${id(hotelId)}/rooms/${id(roomId)}`, data, options),
    remove: (hotelId, roomId, options) =>
      remove(`/hotels/${id(hotelId)}/rooms/${id(roomId)}`, options),
  },
  bookings: {
    listMine: (options) => get('/bookings/me', undefined, options),
    list: (query, options) => get('/bookings', query, options),
    get: (bookingId, options) =>
      get(`/bookings/${id(bookingId)}`, undefined, options),
    create: (data, options) => send('POST', '/bookings', data, options),
    cancel: (bookingId, options) =>
      send('POST', `/bookings/${id(bookingId)}/cancel`, undefined, options),
  },
  reviews: {
    listHotel: (hotelId, query, options) =>
      get(`/hotels/${id(hotelId)}/reviews`, query, options),
    listMine: (options) => get('/reviews/me', undefined, options),
    get: (reviewId, options) =>
      get(`/reviews/${id(reviewId)}`, undefined, options),
    create: (data, options) => send('POST', '/reviews', data, options),
    update: (reviewId, data, options) =>
      send('PATCH', `/reviews/${id(reviewId)}`, data, options),
    remove: (reviewId, options) => remove(`/reviews/${id(reviewId)}`, options),
  },
  facilities: {
    list: (options) => get('/facilities', undefined, options),
    create: (data, options) => send('POST', '/facilities', data, options),
    replace: (facilityId, data, options) =>
      send('PUT', `/facilities/${id(facilityId)}`, data, options),
    remove: (facilityId, options) =>
      remove(`/facilities/${id(facilityId)}`, options),
  },
  images: {
    list: (hotelId, options) =>
      get(`/hotels/${id(hotelId)}/images`, undefined, options),
    create: (hotelId, file, options) =>
      send('POST', `/hotels/${id(hotelId)}/images`, imageFormData(file), options),
    replace: (hotelId, imageId, file, options) =>
      send(
        'PUT',
        `/hotels/${id(hotelId)}/images/${id(imageId)}`,
        imageFormData(file),
        options,
      ),
    remove: (hotelId, imageId, options) =>
      remove(`/hotels/${id(hotelId)}/images/${id(imageId)}`, options),
  },
  health: {
    live: (options) => get('/health/live', undefined, options),
    ready: (options) => get('/health/ready', undefined, options),
  },
  analytics: {
    list: (query, options) => get('/analytics/hotels', query, options),
  },
};
