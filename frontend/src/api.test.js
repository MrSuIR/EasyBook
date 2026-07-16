import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError, api, buildQuery } from './api.js';

const response = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

const withMockFetch = async (mock, action) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await action();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test('buildQuery skips nullish values and repeats arrays', () => {
  assert.equal(
    buildQuery({ page: 2, tag: ['spa', 'pool'], empty: '', ignored: null }),
    '?page=2&tag=spa&tag=pool&empty=',
  );
});

test('JSON request includes credentials, content type and AbortSignal', async () => {
  const controller = new AbortController();
  let call;

  const result = await withMockFetch(
    async (url, options) => {
      call = { url, options };
      return response(201, { status: 'OK' });
    },
    () =>
      api.auth.register(
        { email: 'user@example.com', password: 'password' },
        { signal: controller.signal },
      ),
  );

  assert.deepEqual(result, { status: 'OK' });
  assert.equal(call.url, '/api/auth/register');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.credentials, 'include');
  assert.equal(call.options.headers.get('Content-Type'), 'application/json');
  assert.equal(
    call.options.body,
    JSON.stringify({ email: 'user@example.com', password: 'password' }),
  );
  assert.equal(call.options.signal, controller.signal);
});

test('namespaced GET builds encoded query parameters', async () => {
  let requestedUrl;

  await withMockFetch(
    async (url) => {
      requestedUrl = url;
      return response(200, { items: [], total: 0, page: 2, per_page: 10 });
    },
    () =>
      api.hotels.list({
        date_from: '2026-08-01',
        date_to: '2026-08-03',
        location: 'Нижний Новгород',
        page: 2,
      }),
  );

  const url = new URL(requestedUrl, 'https://easybook.test');
  assert.equal(url.pathname, '/api/hotels');
  assert.equal(url.searchParams.get('date_from'), '2026-08-01');
  assert.equal(url.searchParams.get('date_to'), '2026-08-03');
  assert.equal(url.searchParams.get('location'), 'Нижний Новгород');
  assert.equal(url.searchParams.get('page'), '2');
});

test('image upload sends FormData without a manual content type', async () => {
  const image = new Blob(['image'], { type: 'image/png' });
  let call;

  await withMockFetch(
    async (url, options) => {
      call = { url, options };
      return response(201, { id: 'image-id' });
    },
    () => api.images.create(7, image),
  );

  assert.equal(call.url, '/api/hotels/7/images');
  assert.ok(call.options.body instanceof FormData);
  assert.equal(call.options.body.get('file').type, 'image/png');
  assert.equal(call.options.headers.has('Content-Type'), false);
});

test('HTTP errors preserve status, code and structured detail', async () => {
  const detail = [{ loc: ['body', 'rating'], msg: 'Input should be less than 6' }];

  await assert.rejects(
    withMockFetch(
      async () => response(422, { code: 'validation_error', detail }),
      () => api.reviews.create({ booking_id: 1, rating: 6, comment: 'Test' }),
    ),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 422);
      assert.equal(error.code, 'validation_error');
      assert.deepEqual(error.detail, detail);
      assert.equal(error.message, 'Input should be less than 6');
      return true;
    },
  );
});

test('204 responses resolve to null without reading JSON', async () => {
  let jsonWasRead = false;

  const result = await withMockFetch(
    async () => ({
      ok: true,
      status: 204,
      json: async () => {
        jsonWasRead = true;
        throw new Error('204 has no body');
      },
    }),
    () => api.images.remove(7, 'c2365558-d27b-4d20-bfe4-cdd926f2a8bd'),
  );

  assert.equal(result, null);
  assert.equal(jsonWasRead, false);
});

test('resource namespaces map every public, client and admin operation', async () => {
  const file = new Blob(['image'], { type: 'image/png' });
  const cases = [
    [() => api.auth.register({}), 'POST', '/api/auth/register'],
    [() => api.auth.login({}), 'POST', '/api/auth/login'],
    [() => api.auth.me(), 'GET', '/api/auth/me'],
    [() => api.auth.logout(), 'POST', '/api/auth/logout'],
    [() => api.hotels.list({ page: 1 }), 'GET', '/api/hotels?page=1'],
    [() => api.hotels.get(1), 'GET', '/api/hotels/1'],
    [() => api.hotels.create({}), 'POST', '/api/hotels'],
    [() => api.hotels.replace(1, {}), 'PUT', '/api/hotels/1'],
    [() => api.hotels.update(1, {}), 'PATCH', '/api/hotels/1'],
    [() => api.hotels.remove(1), 'DELETE', '/api/hotels/1'],
    [() => api.rooms.list(1, { date_from: '2026-08-01' }), 'GET', '/api/hotels/1/rooms?date_from=2026-08-01'],
    [() => api.rooms.get(1, 2), 'GET', '/api/hotels/1/rooms/2'],
    [() => api.rooms.create(1, {}), 'POST', '/api/hotels/1/rooms'],
    [() => api.rooms.replace(1, 2, {}), 'PUT', '/api/hotels/1/rooms/2'],
    [() => api.rooms.update(1, 2, {}), 'PATCH', '/api/hotels/1/rooms/2'],
    [() => api.rooms.remove(1, 2), 'DELETE', '/api/hotels/1/rooms/2'],
    [() => api.bookings.listMine(), 'GET', '/api/bookings/me'],
    [() => api.bookings.list({ page: 1 }), 'GET', '/api/bookings?page=1'],
    [() => api.bookings.get(3), 'GET', '/api/bookings/3'],
    [() => api.bookings.create({}), 'POST', '/api/bookings'],
    [() => api.bookings.cancel(3), 'POST', '/api/bookings/3/cancel'],
    [() => api.reviews.listHotel(1, { page: 1 }), 'GET', '/api/hotels/1/reviews?page=1'],
    [() => api.reviews.listMine(), 'GET', '/api/reviews/me'],
    [() => api.reviews.get(4), 'GET', '/api/reviews/4'],
    [() => api.reviews.create({}), 'POST', '/api/reviews'],
    [() => api.reviews.update(4, {}), 'PATCH', '/api/reviews/4'],
    [() => api.reviews.remove(4), 'DELETE', '/api/reviews/4'],
    [() => api.facilities.list(), 'GET', '/api/facilities'],
    [() => api.facilities.create({}), 'POST', '/api/facilities'],
    [() => api.facilities.replace(5, {}), 'PUT', '/api/facilities/5'],
    [() => api.facilities.remove(5), 'DELETE', '/api/facilities/5'],
    [() => api.images.list(1), 'GET', '/api/hotels/1/images'],
    [() => api.images.create(1, file), 'POST', '/api/hotels/1/images'],
    [() => api.images.replace(1, 'image-id', file), 'PUT', '/api/hotels/1/images/image-id'],
    [() => api.images.remove(1, 'image-id'), 'DELETE', '/api/hotels/1/images/image-id'],
    [() => api.health.live(), 'GET', '/api/health/live'],
    [() => api.health.ready(), 'GET', '/api/health/ready'],
    [() => api.analytics.list({ page: 1 }), 'GET', '/api/analytics/hotels?page=1'],
  ];
  const calls = [];
  await withMockFetch(async (url, options) => {
    calls.push([options.method, url]);
    return response(200, {});
  }, async () => {
    for (const [invoke] of cases) await invoke();
  });
  assert.deepEqual(calls, cases.map(([, method, url]) => [method, url]));
});
