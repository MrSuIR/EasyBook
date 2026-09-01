export const emptyHotel = { title: "", location: "" };
export const emptyRoom = {
  title: "",
  description: "",
  price: 0,
  quantity: 1,
  facilities_ids: [],
};
export const emptyUser = {
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  role: "client",
};

export async function loadAllPages(fetchPage) {
  const first = await fetchPage(1);
  const pageCount = Math.ceil(first.total / 100);
  if (pageCount <= 1) return first;
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2)),
  );
  return { ...first, items: [first, ...rest].flatMap((page) => page.items) };
}

export function confirmDelete(message, action) {
  if (window.confirm(message)) return action();
  return Promise.resolve();
}
