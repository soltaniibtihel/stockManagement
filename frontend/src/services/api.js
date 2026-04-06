import axios from 'axios';

// Base API configuration
const api = axios.create({
  baseURL: 'http://localhost:8080/api', // Adjust if the default backend port is different
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if we implement auth later
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for generic error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      console.error('Unauthorized access');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
