import axios from 'axios';

// API URL with fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Log API URL in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('API URL:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok warning page
  },
  withCredentials: false,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API helper functions
export const authAPI = {
  login: (data: { email: string; password: string }) => 
    api.post('/auth/login', data),
  signup: (data: any) => 
    api.post('/auth/signup', data),
  getProfile: () => 
    api.get('/auth/me'),
};

export const eventsAPI = {
  getAll: (params?: any) => 
    api.get('/events', { params }),
  getById: (id: string) => 
    api.get(`/events/${id}`),
  create: (data: FormData | any) => {
    // Check if data is FormData for image upload
    if (data instanceof FormData) {
      return api.post('/events', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/events', data);
  },
  update: (id: string, data: FormData | any) => {
    // Check if data is FormData for image upload
    if (data instanceof FormData) {
      return api.put(`/events/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put(`/events/${id}`, data);
  },
  delete: (id: string) => 
    api.delete(`/events/${id}`),
  getRegistrations: (id: string) => 
    api.get(`/events/${id}/registrations`),
};

export const ticketsAPI = {
  register: (eventId: string) => 
    api.post(`/tickets/register/${eventId}`),
  getMyTickets: () => 
    api.get('/tickets/my-tickets'),
  getById: (ticketId: string) => 
    api.get(`/tickets/${ticketId}`),
  verify: (data: { ticketId: string; eventId: string }) => 
    api.post('/tickets/verify', data),
  cancel: (ticketId: string) =>
    api.patch(`/tickets/${ticketId}/cancel`),
  download: (ticketId: string) => 
    api.get(`/tickets/${ticketId}/download`, { responseType: 'blob' }),
  preview: (ticketId: string) => 
    api.get(`/tickets/${ticketId}/preview`, { responseType: 'blob' }),
};

export const attendanceAPI = {
  getMyAttendance: () => 
    api.get('/attendance/my-attendance'),
  getEventAttendance: (eventId: string) => 
    api.get(`/attendance/event/${eventId}`),
  getEventStats: (eventId: string) => 
    api.get(`/attendance/event/${eventId}/stats`),
};

export const certificatesAPI = {
  getMyCertificates: () => 
    api.get('/certificates/my-certificates'),
  generate: (eventId: string) => 
    api.post(`/certificates/generate/${eventId}`),
  download: (certificateId: string) => 
    api.get(`/certificates/${certificateId}/download`, { responseType: 'blob' }),
  preview: (certificateId: string) => 
    api.get(`/certificates/${certificateId}/preview`, { responseType: 'blob' }),
  getEventCertificates: (eventId: string) => 
    api.get(`/certificates/event/${eventId}`),
};

export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: FormData | any) => {
    if (data instanceof FormData) {
      return api.put('/users/me', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put('/users/me', data);
  },
};
