import api from './api';

export const agentCommissionAdminService = {
  listCommissions: async (status) => {
    const response = await api.get('/commissions/admin', {
      params: status ? { status } : {},
    });
    return response.data;
  },

  verifyCommission: async (commissionId) => {
    const response = await api.put(`/commissions/${commissionId}/verify`);
    return response.data;
  },

  reverseCommission: async (commissionId, reason = '') => {
    const response = await api.post(`/commissions/${commissionId}/reverse`, {
      reason,
    });
    return response.data;
  },
};
