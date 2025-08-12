import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({ baseURL: `${API_BASE_URL}/api` });

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('qi_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('qi_token');
  }
}

export function getStoredAuth() {
  const token = localStorage.getItem('qi_token');
  const role = localStorage.getItem('qi_role');
  const phone = localStorage.getItem('qi_phone');
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return { token, role, phone };
}

export const AuthAPI = {
  requestOtp: (phone) => api.post('/auth/request-otp', { phone }).then(r => r.data),
  verifyOtp: ({ phone, code, role }) => api.post('/auth/verify-otp', { phone, code, role }).then(r => r.data),
};

export const OrdersAPI = {
  list: () => api.get('/orders').then(r => r.data),
  create: (payload) => api.post('/orders', payload).then(r => r.data),
  assign: (orderId, partnerPhone) => api.post(`/orders/${orderId}/assign`, { partnerPhone }).then(r => r.data),
  updateStatus: (orderId, status) => api.post(`/orders/${orderId}/status`, { status }).then(r => r.data),
  updateLocation: (orderId, { lat, lng }) => api.post(`/orders/${orderId}/location`, { lat, lng }).then(r => r.data),
};

export default api;