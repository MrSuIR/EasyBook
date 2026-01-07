import apiClient from './client';
import { Facility } from '../types';

export const facilitiesApi = {
  getAll: async (): Promise<Facility[]> => {
    const response = await apiClient.get('/facilities');
    return response.data;
  },

  create: async (title: string): Promise<Facility> => {
    const response = await apiClient.post('/facilities', { title });
    return response.data;
  },
};
