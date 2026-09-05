import api from './api';

export const complianceOpsService = {
  getSeoSummary: async () => {
    const response = await api.get('/admin/seo');
    return response.data;
  },

  runSeoRankingChecks: async () => {
    const response = await api.post('/admin/seo/rankings/check');
    return response.data;
  },

  regenerateSitemap: async () => {
    const response = await api.post('/admin/seo/regenerate-sitemap');
    return response.data;
  },

  pingGoogle: async () => {
    const response = await api.post('/admin/seo/ping-google');
    return response.data;
  },

  exportPersonalData: async () => {
    const response = await api.get('/export/personal-data');
    return response.data;
  },
};
