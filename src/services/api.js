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
  return 'https://rentalhub.com.ng/api';
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
    'X-RentalHub-Client': 'native',
  },
});

let onUnauthorized = null;
export const setOnUnauthorized = (callback) => {
  onUnauthorized = callback;
};

let isRefreshing = false;
let pendingRequests = [];

const isSessionValidationRequest = (config = {}) => {
  const url = String(config.url || '');
  return Boolean(config.authCritical) || /\/auth\/me(?:$|[?#/])/i.test(url);
};

const isRefreshRequest = (config = {}) => String(config.url || '').includes('/auth/refresh-token');

const setRequestAuthHeader = (config, token) => {
  config.headers = {
    ...(config.headers || {}),
    Authorization: `Bearer ${token}`,
    'X-RentalHub-Client': 'native',
  };
};

const rejectPendingRequests = (error) => {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
};

const resolvePendingRequests = (token) => {
  pendingRequests.forEach(({ resolve }) => resolve(token));
  pendingRequests = [];
};

const refreshNativeSession = async () => {
  const sessionToken = await storageService.getSessionToken();

  if (!sessionToken) {
    throw new Error('No native session token available.');
  }

  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh-token`,
    { session_token: sessionToken },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-RentalHub-Client': 'native',
      },
    }
  );

  const payload = response.data?.data || {};
  if (!response.data?.success || !payload.token) {
    throw new Error(response.data?.message || 'Native session refresh failed.');
  }

  await storageService.saveToken(payload.token);
  await storageService.saveSessionToken(payload.session_token);
  return payload.token;
};

api.interceptors.request.use(
  async (config) => {
    const token = await storageService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.__authToken = token;
    }
    config.headers['X-RentalHub-Client'] = 'native';
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
    const originalRequest = error.config || {};

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest(originalRequest)) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token) => {
              originalRequest._retry = true;
              setRequestAuthHeader(originalRequest, token);
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const nextToken = await refreshNativeSession();
        resolvePendingRequests(nextToken);
        setRequestAuthHeader(originalRequest, nextToken);
        return api(originalRequest);
      } catch (refreshError) {
        rejectPendingRequests(refreshError);
        await storageService.clearAll();
        if (typeof onUnauthorized === 'function') {
          onUnauthorized();
        }
      } finally {
        isRefreshing = false;
      }
    } else if (error.response?.status === 401 && isSessionValidationRequest(originalRequest)) {
      await storageService.clearAll();
      if (typeof onUnauthorized === 'function') {
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
