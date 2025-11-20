import api from './api';
import { storageService } from './storageService';
import jwtDecode from 'jwt-decode';

export const authService = {
  // Register
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      await storageService.saveToken(response.data.data.token);
      await storageService.saveUser(response.data.data.user);
    }
    return response.data;
  },

  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      await storageService.saveToken(response.data.data.token);
      await storageService.saveUser(response.data.data.user);
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    await storageService.clearAll();
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    if (response.data.success) {
      await storageService.saveUser(response.data.data);
    }
    return response.data;
  },

  // Check if authenticated
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

  // Upload passport
  uploadPassport: async (imageUri) => {
    const formData = new FormData();
    formData.append('passport', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'passport.jpg',
    });

    const response = await api.post('/auth/upload-passport', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};