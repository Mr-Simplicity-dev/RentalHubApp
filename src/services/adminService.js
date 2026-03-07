import api from './api';

export const adminService = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getPendingVerifications: async (params = {}) => {
    const response = await api.get('/admin/verifications/pending', { params });
    return response.data;
  },

  approveVerification: async (id) => {
    const response = await api.post(`/admin/verifications/${id}/approve`);
    return response.data;
  },

  rejectVerification: async (id) => {
    const response = await api.post(`/admin/verifications/${id}/reject`);
    return response.data;
  },

  getProperties: async (params = {}) => {
    const response = await api.get('/admin/properties', { params });
    return response.data;
  },

  getPropertyById: async (id) => {
    const response = await api.get(`/admin/properties/${id}`);
    return response.data;
  },

  approveProperty: async (id) => {
    const response = await api.patch(`/admin/properties/${id}/approve`);
    return response.data;
  },

  rejectProperty: async (id) => {
    const response = await api.patch(`/admin/properties/${id}/reject`);
    return response.data;
  },

  getApplications: async (params = {}) => {
    const response = await api.get('/admin/applications', { params });
    return response.data;
  },

  getApplicationById: async (id) => {
    const response = await api.get(`/admin/applications/${id}`);
    return response.data;
  },

  approveApplication: async (id) => {
    const response = await api.post(`/admin/applications/${id}/approve`);
    return response.data;
  },

  rejectApplication: async (id) => {
    const response = await api.post(`/admin/applications/${id}/reject`);
    return response.data;
  },
};
