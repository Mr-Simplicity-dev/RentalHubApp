import api from './api';

export const userService = {
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await api.put('/users/profile', payload);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  getVerificationStatus: async () => {
    const response = await api.get('/users/verification/status');
    return response.data;
  },

  createLiveCaptureSession: async () => {
    const response = await api.post('/users/verification/live-capture/session');
    return response.data;
  },

  deleteAccount: async (password) => {
    const response = await api.delete('/users/account', {
      data: { password },
    });
    return response.data;
  },
};
