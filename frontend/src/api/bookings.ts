import apiClient from './client';
import { Booking, BookingCreate } from '../types';

export const bookingsApi = {
  getAll: async (): Promise<Booking[]> => {
    const response = await apiClient.get('/bookings');
    return response.data;
  },

  getMy: async (): Promise<Booking[]> => {
    const response = await apiClient.get('/bookings/me');
    return response.data;
  },

  create: async (data: BookingCreate): Promise<Booking> => {
    const response = await apiClient.post('/bookings', data);
    return response.data;
  },
};
