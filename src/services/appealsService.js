import api from './api';

export const appealsService = {
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
