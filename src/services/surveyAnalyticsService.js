import api from './api';

export const surveyAnalyticsService = {
  getAnalysis: async (type = 'tenant') => {
    const response = await api.get('/admin/survey/analysis', { params: { type } });
    return response.data;
  },

  getResponses: async (type='tenant', page=1) => (await api.get('/admin/survey/responses',{params:{type,page,limit:25}})).data,

  enableAllNigerianLgas: async () => {
    const response = await api.post('/admin/survey/location-config/enable-all');
    return response.data;
  },
};
