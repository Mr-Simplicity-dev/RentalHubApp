import { Platform } from 'react-native';
import api from './api';
import { storageService } from './storageService';
import { jwtDecode } from 'jwt-decode';

const isTokenActive = (token) => {
  if (!token) {
    return false;
  }

  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const isTerminalSessionError = (error) => {
  const status = error?.response?.status;
  return (
    error?.code === 'AUTH_SESSION_MISSING' ||
    status === 400 ||
    status === 401 ||
    status === 403
  );
};

const createMissingSessionError = () => {
  const error = new Error('No native session token available.');
  error.code = 'AUTH_SESSION_MISSING';
  return error;
};

export const authService = {
  register: async (userData, turnstileToken) => {
    const response = await api.post('/auth/register', { ...userData, turnstile_token: turnstileToken });
    if (response.data.success) {
      const { token, session_token: sessionToken, user } = response.data.data;
      await storageService.saveToken(token);
      await storageService.saveSessionToken(sessionToken);
      await storageService.saveUser(user);
    }
    return response.data;
  },

  login: async (email, password, turnstileToken) => {
    const response = await api.post('/auth/login', { email, password, turnstile_token: turnstileToken });
    if (response.data.success) {
      const { token, session_token: sessionToken, user } = response.data.data;
      await storageService.saveToken(token);
      await storageService.saveSessionToken(sessionToken);
      await storageService.saveUser(user);
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // token might already be invalid; still clear local state
    }
    await storageService.clearAll();
  },

  getTwoFactorStatus: async () => {
    const response = await api.get('/auth/2fa/status');
    return response.data;
  },

  setupTotp: async () => {
    const response = await api.post('/auth/2fa/totp/setup');
    return response.data;
  },

  confirmTotp: async ({ code }) => {
    const response = await api.post('/auth/2fa/totp/confirm', { code });
    return response.data;
  },

  disableTotp: async ({ code, recovery_code } = {}) => {
    const response = await api.post('/auth/2fa/totp/disable', {
      code,
      recovery_code,
    });
    return response.data;
  },

  sendWithdrawalOtp: async () => {
    const response = await api.post('/auth/2fa/send-withdrawal-otp');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me', {
      authCritical: true,
      logoutOnUnauthorized: true,
    });
    if (response.data.success) {
      await storageService.saveUser(response.data.data);
    }
    return response.data;
  },

  hydrateSession: async (sessionData) => {
    const token = sessionData?.token;
    const sessionToken = sessionData?.session_token || sessionData?.sessionToken;
    const user = sessionData?.user;

    if (!token && !sessionToken && !user) {
      return;
    }

    await storageService.saveToken(token);
    await storageService.saveSessionToken(sessionToken);
    await storageService.saveUser(user);
  },

  refreshSession: async () => {
    const sessionToken = await storageService.getSessionToken();
    if (!sessionToken) {
      throw createMissingSessionError();
    }

    const response = await api.post('/auth/refresh-token', {
      session_token: sessionToken,
    });

    if (response.data?.success) {
      await authService.hydrateSession(response.data.data);
    }

    return response.data;
  },

  isAuthenticated: async () => {
    const token = await storageService.getToken();
    if (isTokenActive(token)) return true;

    try {
      const refreshed = await authService.refreshSession();
      return Boolean(refreshed?.success && refreshed?.data?.token);
    } catch (error) {
      if (isTerminalSessionError(error)) {
        return false;
      }

      throw error;
    }
  },

  hasLocallyUsableSession: async () => {
    const [token, sessionToken] = await Promise.all([
      storageService.getToken(),
      storageService.getSessionToken(),
    ]);

    return isTokenActive(token) || isTokenActive(sessionToken);
  },

  verifyEmail: async (token) => {
    const response = await api.get(`/auth/verify-email/${token}`);
    return response.data;
  },

  sendPhoneOTP: async () => {
    const response = await api.post('/auth/send-phone-otp');
    return response.data;
  },

  verifyPhone: async (otp) => {
    const response = await api.post('/auth/verify-phone', { otp });
    return response.data;
  },

  forgotPassword: async (email, turnstileToken) => {
    const response = await api.post('/auth/forgot-password', { email, turnstile_token: turnstileToken });
    return response.data;
  },

  resetPassword: async (token, password, turnstileToken) => {
    const response = await api.post(`/auth/reset-password/${token}`, { password, turnstile_token: turnstileToken });
    return response.data;
  },

  getRegistrationFlags: async (params = {}) => {
    const response = await api.get('/auth/registration-flags', { params });
    return response.data;
  },

  initializeRegistrationPayment: async (payload, turnstileToken) => {
    const response = await api.post('/auth/register/payment', { ...payload, turnstile_token: turnstileToken });
    return response.data;
  },

  completeRegistrationPayment: async (reference) => {
    const response = await api.post(`/auth/register/payment/complete/${reference}`);

    if (response.data?.success) {
      await authService.hydrateSession(response.data.data);
    }

    return response.data;
  },

  payForeignCardAdjustment: async (reference) => {
    const response = await api.post(`/auth/register/payment/foreign-card/${reference}`);
    return response.data;
  },

  acceptLawyerInvite: async (payload, turnstileToken) => {
    const response = await api.post('/auth/lawyer/accept-invite', { ...payload, turnstile_token: turnstileToken });
    return response.data;
  },

  acceptAgentInvite: async (payload, turnstileToken) => {
    const response = await api.post('/auth/agent/accept-invite', { ...payload, turnstile_token: turnstileToken });
    return response.data;
  },

  uploadPassport: async (imageInput, liveCaptureToken = '') => {
    const formData = new FormData();
    const fileAsset =
      typeof imageInput === 'string'
        ? { uri: imageInput, type: 'image/jpeg', name: 'passport.jpg' }
        : imageInput || {};

    if (Platform.OS === 'web' && fileAsset.file) {
      formData.append('passport', fileAsset.file, fileAsset.name || 'passport.jpg');
    } else {
      formData.append('passport', {
        uri: fileAsset.uri,
        type: fileAsset.type || 'image/jpeg',
        name: fileAsset.name || 'passport.jpg',
      });
    }

    formData.append('capture_source', 'live_camera');
    if (liveCaptureToken) {
      formData.append('live_capture_token', liveCaptureToken);
    }

    const response = await api.post('/auth/upload-passport', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getLawyerInvites: async (params = {}) => {
    const response = await api.get('/auth/lawyer-invites', { params });
    return response.data;
  },

  resendLawyerInvite: async (inviteId) => {
    const response = await api.patch(`/auth/lawyer-invites/${inviteId}/resend`);
    return response.data;
  },

  updateLawyerInviteEmail: async (inviteId, lawyerEmail) => {
    const response = await api.patch(`/auth/lawyer-invites/${inviteId}/email`, {
      lawyer_email: lawyerEmail,
    });
    return response.data;
  },
};
