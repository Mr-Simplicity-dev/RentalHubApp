import api from './api';

export const complianceService = {
  getOverview: async () => {
    const response = await api.get('/compliance/overview');
    return response.data;
  },

  getRiskTrend: async () => {
    const response = await api.get('/compliance/risk-trend');
    return response.data;
  },
};
