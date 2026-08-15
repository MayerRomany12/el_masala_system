import axios from 'axios';

const API_BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token into requests reliably
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('almasalla_token');
  if (token) {
    if (config.headers.set) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle global 401 unauthorized errors without infinite loops
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only clear storage and redirect if token existed and path is not /login
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('almasalla_token');
        localStorage.removeItem('almasalla_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
