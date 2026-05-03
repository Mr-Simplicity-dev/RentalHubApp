import api from './api';

export const rentSavingsService = {
  // Savings goals
  createSavingsGoal: async (goalData) => {
    const response = await api.post('/rent-savings/goals', goalData);
    return response.data;
  },

  getSavingsGoals: async (params) => {
    const response = await api.get('/rent-savings/goals', { params });
    return response.data;
  },

  getSavingsGoalDetails: async (goalId) => {
    const response = await api.get(`/rent-savings/goals/${goalId}`);
    return response.data;
  },

  updateSavingsGoal: async (goalId, goalData) => {
    const response = await api.put(`/rent-savings/goals/${goalId}`, goalData);
    return response.data;
  },

  deleteSavingsGoal: async (goalId) => {
    const response = await api.delete(`/rent-savings/goals/${goalId}`);
    return response.data;
  },

  // Savings contributions
  makeContribution: async (goalId, contributionData) => {
    const response = await api.post(`/rent-savings/goals/${goalId}/contributions`, contributionData);
    return response.data;
  },

  getContributions: async (goalId, params) => {
    const response = await api.get(`/rent-savings/goals/${goalId}/contributions`, { params });
    return response.data;
  },

  // Withdrawals
  requestWithdrawal: async (goalId, withdrawalData) => {
    const response = await api.post(`/rent-savings/goals/${goalId}/withdrawals`, withdrawalData);
    return response.data;
  },

  getWithdrawals: async (goalId, params) => {
    const response = await api.get(`/rent-savings/goals/${goalId}/withdrawals`, { params });
    return response.data;
  },

  // Dashboard and stats
  getDashboard: async () => {
    const response = await api.get('/rent-savings/dashboard');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/rent-savings/stats');
    return response.data;
  },

  // Admin endpoints
  getAllGoals: async (params) => {
    const response = await api.get('/rent-savings/admin/goals', { params });
    return response.data;
  },

  getAllWithdrawals: async (params) => {
    const response = await api.get('/rent-savings/admin/withdrawals', { params });
    return response.data;
  },

  approveWithdrawal: async (withdrawalId) => {
    const response = await api.patch(`/rent-savings/admin/withdrawals/${withdrawalId}/approve`);
    return response.data;
  },

  rejectWithdrawal: async (withdrawalId, reason) => {
    const response = await api.patch(`/rent-savings/admin/withdrawals/${withdrawalId}/reject`, {
      reason,
    });
    return response.data;
  },

  // Auto-save settings
  updateAutoSaveSettings: async (goalId, settings) => {
    const response = await api.put(`/rent-savings/goals/${goalId}/auto-save`, settings);
    return response.data;
  },
};
