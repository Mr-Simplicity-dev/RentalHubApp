import api from './api';

export const agentService = {
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getEarnings: async (agentId, landlordId) => {
    const response = await api.get(`/commissions/agents/${agentId}/earnings`, {
      params: landlordId ? { landlordId } : undefined,
    });
    return response.data;
  },

  getCommissionHistory: async (agentId, params = {}) => {
    const response = await api.get(`/commissions/agents/${agentId}/history`, { params });
    return response.data;
  },

  getWithdrawalRequests: async (agentId, params = {}) => {
    const response = await api.get(`/withdrawals/agents/${agentId}/withdrawal-requests`, { params });
    return response.data;
  },

  getWithdrawalSummary: async (agentId, landlordId) => {
    const response = await api.get(`/withdrawals/agents/${agentId}/withdrawal-summary`, {
      params: { landlordId },
    });
    return response.data;
  },

  createWithdrawalRequest: async (agentId, payload) => {
    const response = await api.post(`/withdrawals/agents/${agentId}/withdrawal-requests`, payload);
    return response.data;
  },
};
