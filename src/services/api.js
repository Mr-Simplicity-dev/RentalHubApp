import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_PRODUCTION_API_BASE_URL = 'https://rentalhub.com.ng/api';
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

const resolveDefaultApiBaseUrl = () => (__DEV__ ? DEFAULT_LOCAL_API_BASE_URL : DEFAULT_PRODUCTION_API_BASE_URL);

export const API_BASE_URL = isConfiguredApiUrl(process.env.API_BASE_URL)
  ? normalizeUrl(process.env.API_BASE_URL)
  : resolveDefaultApiBaseUrl();

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/i, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;
