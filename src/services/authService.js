import api from './api';
import { storageService } from './storageService';
import { jwtDecode } from 'jwt-decode';

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      const { token, user } = response.data.data;
      await storageService.saveToken(token);
      await storageService.saveUser(user);
    }
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { token, user } = response.data.data;
      await storageService.saveToken(token);
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

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    if (response.data.success) {
      await storageService.saveUser(response.data.data);
    }
    return response.data;
  },

  isAuthenticated: async () => {
    const token = await storageService.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
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

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await api.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  },

  acceptLawyerInvite: async (payload) => {
    const response = await api.post('/auth/lawyer/accept-invite', payload);
    return response.data;
  },

  uploadPassport: async (imageUri, liveCaptureToken = '') => {
    const formData = new FormData();
    formData.append('passport', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'passport.jpg',
    });
    formData.append('capture_source', 'live_camera');
    if (liveCaptureToken) {
      formData.append('live_capture_token', liveCaptureToken);
    }

    const response = await api.post('/auth/upload-passport', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getLawyerInvites: async () => {
    const response = await api.get('/auth/lawyer-invites');
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
