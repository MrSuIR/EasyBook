import apiClient from './client';
import { Room, RoomCreate, RoomPatch, RoomSearchParams } from '../types';

export const roomsApi = {
  getByHotel: async (hotelId: number, params?: RoomSearchParams): Promise<Room[]> => {
    const response = await apiClient.get(`/hotels/${hotelId}/rooms`, { params });
    return response.data;
  },

  getById: async (hotelId: number, roomId: number): Promise<Room> => {
    const response = await apiClient.get(`/hotels/${hotelId}/rooms/${roomId}`);
    return response.data;
  },

  create: async (hotelId: number, data: Omit<RoomCreate, 'hotel_id'>): Promise<Room> => {
    const response = await apiClient.post(`/hotels/${hotelId}/rooms`, data);
    return response.data;
  },

  update: async (hotelId: number, roomId: number, data: Omit<RoomCreate, 'hotel_id'>): Promise<Room> => {
    const response = await apiClient.put(`/hotels/${hotelId}/rooms/${roomId}`, data);
    return response.data;
  },

  patch: async (hotelId: number, roomId: number, data: RoomPatch): Promise<Room> => {
    const response = await apiClient.patch(`/hotels/${hotelId}/rooms/${roomId}`, data);
    return response.data;
  },

  delete: async (hotelId: number, roomId: number): Promise<void> => {
    await apiClient.delete(`/hotels/${hotelId}/rooms/${roomId}`);
  },
};
