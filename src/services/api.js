import { Platform } from 'react-native';
import axios from 'axios';
import {
  markNetworkHealthy,
  markNetworkProblem,
} from './networkStatusService';
import { storageService } from './storageService';

const DEFAULT_LOCAL_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

const normalizeUrl = (value = '') => String(value).trim().replace(/\/+$/, '');

const isConfiguredApiUrl = (value) => {
  const normalized = normalizeUrl(value);
  return (
    normalized &&
    normalized !== '...' &&
    !normalized.includes('your-backend-url.com')
  );
};

const resolveDefaultApiBaseUrl = () => {
  if (__DEV__) return DEFAULT_LOCAL_API_BASE_URL;
  throw new Error('API_BASE_URL env var is required in production. Set it via .env or build pipeline.');
};

let _apiBaseUrl;
try {
  _apiBaseUrl = isConfiguredApiUrl(process.env.API_BASE_URL)
    ? normalizeUrl(process.env.API_BASE_URL)
    : resolveDefaultApiBaseUrl();
} catch (e) {
  console.error('[api]', e.message);
  _apiBaseUrl = '';
}
export const API_BASE_URL = _apiBaseUrl;

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/i, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let onUnauthorized = null;
export const setOnUnauthorized = (callback) => {
  onUnauthorized = callback;
};

api.interceptors.request.use(
  async (config) => {
    const token = await storageService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    markNetworkHealthy();
    return response;
  },
  async (error) => {
    markNetworkProblem(error);
    if (error.response?.status === 401) {
      await storageService.clearAll();
      if (typeof onUnauthorized === 'function') {
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
