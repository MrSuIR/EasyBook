import assert from "node:assert/strict";
import test from "node:test";
import { api, buildQuery } from "./api.js";
import {
  filterBookings,
  getBookingSection,
  localDateKey,
} from "./accountBookings.js";
import { addLocalDays } from "./dateUtils.js";
import { loadGuestImpressions } from "./guestImpressions.js";

test("guest impressions keep hotel links and select recent public reviews without filtering ratings", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  const calls = [];
  const hotels = [1, 2, 3, 4].map((id) => ({ id, title: `Отель ${id}` }));
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const id = Number(url.match(/hotels\/(\d+)/)[1]);
    return Response.json({ items: [{ id: id + 10, rating: id, comment: `Отзыв ${id}`, created_at: `2026-09-0${id}T12:00:00Z` }] });
  };
  try {
    const result = await loadGuestImpressions(hotels, { signal: controller.signal });
    assert.equal(result.partialError, false);
    assert.deepEqual(result.items.map(({ hotel, review }) => [hotel.id, review.id, review.rating]), [[4, 14, 4], [3, 13, 3], [2, 12, 2], [1, 11, 1]]);
    assert.ok(calls.every(({ url, options }) => url.endsWith("/reviews?page=1&per_page=1&sort_by=created_at&sort_order=desc") && options.signal === controller.signal));
  } finally { globalThis.fetch = originalFetch; }
});

test("guest impressions retain successful reviews when another hotel fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes("/hotels/1/")) return Response.json({ detail: "Ошибка" }, { status: 503 });
    return Response.json({ items: [{ id: 20, rating: 2, comment: "Не понравилось", created_at: "2026-09-01T12:00:00Z" }] });
  };
  try {
    const result = await loadGuestImpressions([{ id: 1 }, { id: 2 }]);
    assert.equal(result.partialError, true);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].review.comment, "Не понравилось");
    assert.equal(result.items[0].hotel.id, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test("guest impressions distinguish unavailable reviews from an empty selection", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ code: "unavailable", detail: "Ошибка" }, { status: 503 });
    await assert.rejects(loadGuestImpressions([{ id: 1 }]), { status: 503 });
    assert.deepEqual(await loadGuestImpressions([]), { items: [], partialError: false });
    globalThis.fetch = async () => Response.json({ items: [] });
    assert.deepEqual(await loadGuestImpressions([{ id: 1 }]), { items: [], partialError: false });
  } finally { globalThis.fetch = originalFetch; }
});

test("guest impressions discard results after their request is cancelled", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  globalThis.fetch = async () => {
    controller.abort();
    return Response.json({ items: [{ id: 10, rating: 5, comment: "Устаревший отзыв", created_at: "2026-09-01T12:00:00Z" }] });
  };
  try {
    await assert.rejects(loadGuestImpressions([{ id: 1 }], { signal: controller.signal }), { name: "AbortError" });
  } finally { globalThis.fetch = originalFetch; }
});

test("buildQuery skips empty values and encodes text", () => {
  assert.equal(
    buildQuery({ location: "Санкт-Петербург", title: "", page: 1 }),
    "?location=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3&page=1",
  );
});

test("auth client sends JSON and keeps the HttpOnly cookie session", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ status: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const credentials = { email: "guest@example.com", password: "password123" };
    await api.auth.register(credentials);
    await api.auth.login(credentials);
    assert.deepEqual(
      calls.map(({ url }) => url),
      ["/api/auth/register", "/api/auth/login"],
    );
    for (const { options } of calls) {
      assert.equal(options.method, "POST");
      assert.equal(options.credentials, "include");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(options.body), credentials);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("hotel details client loads related data and creates a booking", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ id: 7 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await api.hotels.get(7);
    await api.rooms.list(7, { date_from: "2026-08-01", date_to: "2026-08-04" });
    await api.images.list(7);
    await api.reviews.list(7, { page: 1, per_page: 4 });
    await api.bookings.create({
      room_id: 12,
      date_from: "2026-08-01",
      date_to: "2026-08-04",
    });

    assert.deepEqual(
      calls.map(({ url }) => url),
      [
        "/api/hotels/7",
        "/api/hotels/7/rooms?date_from=2026-08-01&date_to=2026-08-04",
        "/api/hotels/7/images",
        "/api/hotels/7/reviews?page=1&per_page=4",
        "/api/bookings",
      ],
    );
    assert.equal(calls.at(-1).options.method, "POST");
    assert.equal(calls.at(-1).options.credentials, "include");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("account client loads own bookings and cancels one", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await api.bookings.mine();
    await api.bookings.cancel(42);
    assert.deepEqual(
      calls.map(({ url }) => url),
      ["/api/bookings/me", "/api/bookings/42/cancel"],
    );
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[1].options.method, "POST");
    assert.equal(calls[1].options.credentials, "include");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("account bookings are split by real dates and cancellation status", () => {
  const bookings = [
    { id: 1, status: "confirmed", date_to: "2026-08-02" },
    { id: 2, status: "confirmed", date_to: "2026-07-20" },
    { id: 3, status: "cancelled", date_to: "2026-08-02" },
  ];

  assert.equal(getBookingSection(bookings[0], "2026-07-22"), "upcoming");
  assert.deepEqual(
    filterBookings(bookings, "past", "2026-07-22").map(({ id }) => id),
    [2],
  );
  assert.deepEqual(
    filterBookings(bookings, "cancelled", "2026-07-22").map(({ id }) => id),
    [3],
  );
  assert.equal(localDateKey(new Date(2026, 6, 22, 0, 30)), "2026-07-22");
  assert.equal(
    localDateKey(addLocalDays(new Date(2026, 11, 31, 12), 1)),
    "2027-01-01",
  );
});

test("admin client exposes catalog, user, analytics, and multipart image operations", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ items: [], total: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await api.hotels.adminList({ title: "море", page: 1 });
    await api.rooms.adminList(4);
    await api.users.list({ sort_by: "email" });
    await api.analytics.hotels({
      date_from: "2026-08-01",
      date_to: "2026-09-01",
    });
    await api.images.upload(4, new Blob(["image"], { type: "image/png" }));

    assert.deepEqual(
      calls.slice(0, 4).map(({ url }) => url),
      [
        "/api/hotels/admin?title=%D0%BC%D0%BE%D1%80%D0%B5&page=1",
        "/api/hotels/4/rooms/admin",
        "/api/users?sort_by=email",
        "/api/analytics/hotels?date_from=2026-08-01&date_to=2026-09-01",
      ],
    );
    assert.equal(calls[4].url, "/api/hotels/4/images");
    assert.equal(calls[4].options.method, "POST");
    assert.ok(calls[4].options.body instanceof FormData);
    assert.equal(calls[4].options.headers, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
