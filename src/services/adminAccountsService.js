import api from './api';

export const adminAccountsService = {
  createAdmin: async (payload) => {
    const response = await api.post('/admin/create-admin', payload);
    return response.data;
  },

  sendVerificationReminder: async (userId) => {
    const response = await api.post(`/super/users/${userId}/verification-reminder`);
    return response.data;
  },
};
