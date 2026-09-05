import api from './api';

export const stateAdminService = {
  getStateDashboardData: async () => {
    const response = await api.get('/state-admin/dashboard');
    return response.data;
  },

  getStatePropertyApprovals: async (params = {}) => {
    const endpoint = params.status === 'pending'
      ? '/admin/properties/pending'
      : '/admin/properties';
    const response = await api.get(endpoint, { params });
    return response.data;
  },

  approveProperty: async (propertyId) => {
    const response = await api.patch(`/admin/properties/${propertyId}/approve`);
    return response.data;
  },

  rejectProperty: async (propertyId, rejectionData = {}) => {
    const response = await api.patch(
      `/admin/properties/${propertyId}/reject`,
      rejectionData
    );
    return response.data;
  },

  getTransactions: async (params = {}) => {
    const response = await api.get('/state-admin/transactions', { params });
    return response.data;
  },

  getCommissionsSummary: async () => {
    const response = await api.get('/state-admin/commissions/summary');
    return response.data;
  },

  requestWithdrawal: async (payload) => {
    const response = await api.post('/state-admin/withdraw', payload);
    return response.data;
  },

  getWithdrawals: async () => {
    const response = await api.get('/state-admin/withdrawals');
    return response.data;
  },
};
