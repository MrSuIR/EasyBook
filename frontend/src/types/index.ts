// User types
export interface User {
  id: number;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Hotel types
export interface Hotel {
  id: number;
  title: string;
  location: string;
}

export interface HotelCreate {
  title: string;
  location: string;
}

export interface HotelPatch {
  title?: string;
  location?: string;
}

// Facility types
export interface Facility {
  id: number;
  title: string;
}

// Room types
export interface Room {
  id: number;
  hotel_id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  facilities: Facility[];
}

export interface RoomCreate {
  hotel_id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  facilities_ids?: number[];
}

export interface RoomPatch {
  title?: string;
  description?: string;
  price?: number;
  quantity?: number;
  facilities_ids?: number[];
}

// Booking types
export interface Booking {
  id: number;
  room_id: number;
  user_id: number;
  date_from: string;
  date_to: string;
  price: number;
  total_cost: number;
  room?: Room;
}

export interface BookingCreate {
  room_id: number;
  date_from: string;
  date_to: string;
}

// Search/Filter types
export interface HotelSearchParams {
  date_from?: string;
  date_to?: string;
  title?: string;
  location?: string;
  page?: number;
  per_page?: number;
}

export interface RoomSearchParams {
  date_from?: string;
  date_to?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

// API Error type
export interface ApiError {
  detail: string;
}
