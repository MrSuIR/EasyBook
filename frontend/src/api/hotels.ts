import apiClient from './client';
import { Hotel, HotelCreate, HotelPatch, HotelSearchParams } from '../types';

export const hotelsApi = {
  getAll: async (params?: HotelSearchParams): Promise<Hotel[]> => {
    const response = await apiClient.get('/hotels', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Hotel> => {
    const response = await apiClient.get(`/hotels/${id}`);
    return response.data;
  },

  create: async (data: HotelCreate): Promise<Hotel> => {
    const response = await apiClient.post('/hotels', data);
    return response.data;
  },

  update: async (id: number, data: HotelCreate): Promise<Hotel> => {
    const response = await apiClient.put(`/hotels/${id}`, data);
    return response.data;
  },

  patch: async (id: number, data: HotelPatch): Promise<Hotel> => {
    const response = await apiClient.patch(`/hotels/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/hotels/${id}`);
  },
};
