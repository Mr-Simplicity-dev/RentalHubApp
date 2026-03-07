import api from './api';

export const dashboardService = {
  getTenantStats: async () => {
    const response = await api.get('/dashboard/tenant/stats');
    return response.data;
  },

  getLandlordStats: async () => {
    const response = await api.get('/dashboard/landlord/stats');
    return response.data;
  },

  getTenantRecentActivities: async (limit = 10) => {
    const response = await api.get('/dashboard/tenant/recent-activities', {
      params: { limit },
    });
    return response.data;
  },

  getLandlordRecentActivities: async (limit = 10) => {
    const response = await api.get('/dashboard/landlord/recent-activities', {
      params: { limit },
    });
    return response.data;
  },
};
