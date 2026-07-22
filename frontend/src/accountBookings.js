export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getBookingSection(booking, today = localDateKey()) {
  if (booking.status === "cancelled") return "cancelled";
  return booking.date_to > today ? "upcoming" : "past";
}

export function filterBookings(bookings, section, today) {
  return bookings.filter((booking) => getBookingSection(booking, today) === section);
}
