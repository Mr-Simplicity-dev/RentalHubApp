import api from './api';

export const surveyAnalyticsService = {
  getAnalysis: async (type = 'tenant') => {
    const response = await api.get('/admin/survey/analysis', { params: { type } });
    return response.data;
  },
};
