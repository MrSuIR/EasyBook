from enum import StrEnum


class UserRole(StrEnum):
    CLIENT = "client"
    ADMIN = "admin"


class BookingStatus(StrEnum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
