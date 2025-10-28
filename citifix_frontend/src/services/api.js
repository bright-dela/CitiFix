import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  registerCitizen: (data) => api.post('/auth/register/citizen/', data),
  registerAuthority: (data) => api.post('/auth/register/authority/', data),
  registerMediaHouse: (data) => api.post('/auth/register/media-house/', data),
  getCurrentUser: () => api.get('/auth/me/'),
  logout: () => api.post('/auth/logout/'),
};

export const reportAPI = {
  getReports: (params) => api.get('/reports/', { params }),
  getReport: (id) => api.get(`/reports/${id}/`),
  createReport: (data) => api.post('/reports/', data),
  updateReport: (id, data) => api.patch(`/reports/${id}/`, data),
  getMyReports: (params) => api.get('/reports/my_reports/', { params }),
  getAssignedReports: (params) => api.get('/reports/assigned_to_me/', { params }),
  updateStatus: (id, status) => api.patch(`/reports/${id}/update_status/`, { status }),
  assignReport: (id, authorityId) => api.patch(`/reports/${id}/assign/`, { authority_id: authorityId }),
  addNote: (id, note) => api.post(`/reports/${id}/add_note/`, { note }),
};

export const documentAPI = {
  upload: (formData) => api.post('/documents/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMyDocuments: () => api.get('/documents/my-documents/'),
  deleteDocument: (id) => api.delete(`/documents/${id}/`),
};

export const adminAPI = {
  getPendingVerifications: () => api.get('/admin/pending-verifications/'),
  getAllUsers: (params) => api.get('/admin/users/', { params }),
  verifyUser: (userId) => api.patch(`/admin/users/${userId}/verify/`),
  rejectUser: (userId, reason) => api.patch(`/admin/users/${userId}/reject/`, { reason }),
  suspendUser: (userId) => api.delete(`/admin/users/${userId}/suspend/`),
};

export default api;