import { api } from "./api.js";

export async function loadGuestImpressions(hotels, { signal } = {}) {
  const results = await Promise.allSettled(
    hotels.slice(0, 9).map(async (hotel) => {
      const response = await api.reviews.list(
        hotel.id,
        { page: 1, per_page: 1, sort_by: "created_at", sort_order: "desc" },
        { signal },
      );
      return response.items.map((review) => ({ review, hotel }));
    }),
  );
  if (signal?.aborted) throw new DOMException("Запрос отменён", "AbortError");
  const failures = results.filter((result) => result.status === "rejected");
  if (results.length && failures.length === results.length)
    throw failures[0].reason;
  const items = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .sort((a, b) =>
      Date.parse(b.review.created_at) - Date.parse(a.review.created_at) ||
      b.review.id - a.review.id,
    );
  return { items, partialError: failures.length > 0 };
}
