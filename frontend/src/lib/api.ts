import axios, { AxiosError, AxiosResponse } from 'axios';
import type {
  ApiErrorResponse,
  ApiResponse,
  Attendance,
  AttendanceStats,
  AuthPayload,
  CertificatesPayload,
  Event,
  EventCertificatesPayload,
  EventFormInput,
  EventsPayload,
  LoginInput,
  PaginatedResponse,
  RegistrationsPayload,
  SignupInput,
  Ticket,
  TicketsPayload,
  User,
  VerificationResult,
  UserPayload,
} from '@/types';

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

type ApiResult<T> = AxiosResponse<ApiResponse<T>>;
type PaginatedApiResult<T> = AxiosResponse<PaginatedResponse<T>>;
type ApiFailure = AxiosError<ApiErrorResponse>;

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
    return Promise.reject(error as ApiFailure);
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
    return Promise.reject(error as ApiFailure);
  }
);

export default api;

// API helper functions
export const authAPI = {
  login: (data: LoginInput): Promise<ApiResult<AuthPayload>> =>
    api.post('/auth/login', data),
  signup: (data: SignupInput): Promise<ApiResult<AuthPayload>> =>
    api.post('/auth/signup', data),
  getProfile: (): Promise<ApiResult<UserPayload>> =>
    api.get('/auth/me'),
  forgotPassword: (data: { email: string }): Promise<ApiResult<Record<string, never>>> =>
    api.post('/auth/forgot-password', data),
  resetPassword: (token: string, data: { password: string }): Promise<ApiResult<Record<string, never>>> =>
    api.post(`/auth/reset-password/${token}`, data),
};

export const eventsAPI = {
  getAll: (params?: Record<string, string | number | boolean | undefined>): Promise<PaginatedApiResult<EventsPayload>> =>
    api.get('/events', { params }),
  getById: (id: string): Promise<ApiResult<{ event: Event }>> =>
    api.get(`/events/${id}`),
  create: (data: FormData | EventFormInput): Promise<ApiResult<{ event: Event }>> => {
    // Check if data is FormData for image upload
    if (data instanceof FormData) {
      return api.post('/events', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/events', data);
  },
  update: (id: string, data: FormData | Partial<EventFormInput> & { status?: Event['status'] }): Promise<ApiResult<{ event: Event; certificates?: unknown }>> => {
    // Check if data is FormData for image upload
    if (data instanceof FormData) {
      return api.put(`/events/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put(`/events/${id}`, data);
  },
  delete: (id: string): Promise<ApiResult<Record<string, never>>> =>
    api.delete(`/events/${id}`),
  getRegistrations: (id: string): Promise<ApiResult<RegistrationsPayload>> =>
    api.get(`/events/${id}/registrations`),
};

export const ticketsAPI = {
  register: (eventId: string): Promise<ApiResult<{ ticket: Ticket }>> =>
    api.post(`/tickets/register/${eventId}`),
  // Backward compatible list
  getMyTickets: (params?: Record<string, string | number | boolean | undefined>): Promise<PaginatedApiResult<TicketsPayload>> =>
    api.get('/tickets/my-tickets', { params }),
  // New alias list (supports pagination)
  getAll: (params?: Record<string, string | number | boolean | undefined>): Promise<PaginatedApiResult<TicketsPayload>> =>
    api.get('/tickets', { params }),
  getById: (ticketId: string): Promise<ApiResult<{ ticket: Ticket }>> =>
    api.get(`/tickets/${ticketId}`),
  verify: (data: { ticketId: string; eventId: string }): Promise<AxiosResponse<{ success: boolean; message: string; verification: VerificationResult }>> =>
    api.post('/tickets/verify', data),
  cancel: (ticketId: string): Promise<ApiResult<{ ticket: Ticket }>> =>
    api.patch(`/tickets/${ticketId}/cancel`),
  download: (ticketId: string): Promise<AxiosResponse<Blob>> =>
    api.get(`/tickets/${ticketId}/download`, { responseType: 'blob' }),
  preview: (ticketId: string): Promise<AxiosResponse<Blob>> =>
    api.get(`/tickets/${ticketId}/preview`, { responseType: 'blob' }),
};

export const attendanceAPI = {
  getMyAttendance: (): Promise<ApiResult<{ attendance: Attendance[] }>> =>
    api.get('/attendance/my-attendance'),
  getEventAttendance: (eventId: string): Promise<ApiResult<{ event: Pick<Event, 'title' | 'date' | 'registeredCount'>; attendance: Attendance[] }>> =>
    api.get(`/attendance/event/${eventId}`),
  getEventStats: (eventId: string): Promise<ApiResult<{ stats: AttendanceStats }>> =>
    api.get(`/attendance/event/${eventId}/stats`),
};

export const certificatesAPI = {
  getMyCertificates: (): Promise<ApiResult<CertificatesPayload>> =>
    api.get('/certificates/my-certificates'),
  generate: (eventId: string): Promise<ApiResult<{ totalAttendees: number; generated: number; skipped: number; errors?: Array<{ userId: string; error: string }> }>> =>
    api.post(`/certificates/generate/${eventId}`),
  download: (certificateId: string): Promise<AxiosResponse<Blob>> =>
    api.get(`/certificates/${certificateId}/download`, { responseType: 'blob' }),
  preview: (certificateId: string): Promise<AxiosResponse<Blob>> =>
    api.get(`/certificates/${certificateId}/preview`, { responseType: 'blob' }),
  getEventCertificates: (eventId: string): Promise<ApiResult<EventCertificatesPayload>> =>
    api.get(`/certificates/event/${eventId}`),
};

export const usersAPI = {
  getMe: (): Promise<ApiResult<UserPayload>> => api.get('/users/me'),
  updateMe: (data: FormData | Partial<Pick<User, 'name' | 'phone' | 'department'>>): Promise<ApiResult<UserPayload>> => {
    if (data instanceof FormData) {
      return api.put('/users/me', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put('/users/me', data);
  },
};
