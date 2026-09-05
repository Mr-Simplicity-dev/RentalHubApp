import api from './api';

export const appealsService = {
  myAppeals: async (params = {}) => {
    const response = await api.get('/appeals/my', { params });
    return response.data;
  },

  submitAppeal: async (payload) => {
    const response = await api.post('/appeals', payload);
    return response.data;
  },

  getAdminAppeals: async (params = {}) => {
    const response = await api.get('/admin/appeals', { params });
    return response.data;
  },

  getAdminAppeal: async (appealId) => {
    const response = await api.get(`/admin/appeals/${appealId}`);
    return response.data;
  },

  markUnderReview: async (appealId) => {
    const response = await api.patch(`/admin/appeals/${appealId}/status`, {
      status: 'under_review',
    });
    return response.data;
  },

  reviewAppeal: async (appealId, status, reviewNote) => {
    const response = await api.post(`/admin/appeals/${appealId}/review`, {
      status,
      review_note: reviewNote,
    });
    return response.data;
  },
};
