import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if not already on auth pages
      const currentPath = window.location.pathname;
      if (!['/login', '/register'].includes(currentPath)) {
        // For protected endpoints, redirect to login
        // But don't redirect for public endpoints like /hotels or /auth/me
        const isProtectedEndpoint = error.config?.url?.includes('/bookings/me') ||
                                   error.config?.url?.includes('/bookings') && error.config?.method === 'post';

        if (isProtectedEndpoint) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
