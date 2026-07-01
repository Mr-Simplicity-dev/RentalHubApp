import api from './api';

export const rentSavingsService = {
  createSavingsPlan: async (planData) => {
    const response = await api.post('/rent-savings/plans', planData);
    return response.data;
  },

  getSavingsPlans: async () => {
    const response = await api.get('/rent-savings/plans');
    return response.data;
  },

  getSavingsPlanDetails: async (planId) => {
    const response = await api.get(`/rent-savings/plans/${planId}`);
    return response.data;
  },

  makeContribution: async (planId, contributionData) => {
    const response = await api.post(
      `/rent-savings/plans/${planId}/contributions`,
      contributionData
    );
    return response.data;
  },

  getContributions: async (planId) => {
    const response = await api.get(`/rent-savings/plans/${planId}/contributions`);
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get('/rent-savings/summary');
    return response.data;
  },
};
