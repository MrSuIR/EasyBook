import { localDateKey } from "./dateUtils.js";

export { localDateKey };

export function getBookingSection(booking, today = localDateKey()) {
  if (booking.status === "cancelled") return "cancelled";
  return booking.date_to > today ? "upcoming" : "past";
}

export function filterBookings(bookings, section, today) {
  return bookings.filter(
    (booking) => getBookingSection(booking, today) === section,
  );
}
