import api from './api';

export const rentSavingsAdminService = {
  getEarlyWithdrawalRequests: async (params = {}) => {
    const response = await api.get('/rent-savings/admin/early-withdrawal-requests', { params });
    return response.data;
  },

  approveEarlyWithdrawal: async (requestId) => {
    const response = await api.patch(
      `/rent-savings/admin/early-withdrawal-requests/${requestId}/approve`
    );
    return response.data;
  },

  rejectEarlyWithdrawal: async (requestId, adminNote) => {
    const response = await api.patch(
      `/rent-savings/admin/early-withdrawal-requests/${requestId}/reject`,
      { admin_note: adminNote }
    );
    return response.data;
  },

  getSetupFees: async () => {
    const response = await api.get('/rent-savings/admin/setup-fees');
    return response.data;
  },

  upsertSetupFee: async (payload) => {
    const response = await api.post('/rent-savings/admin/setup-fees', payload);
    return response.data;
  },

  deleteSetupFee: async (feeId) => {
    const response = await api.delete(`/rent-savings/admin/setup-fees/${feeId}`);
    return response.data;
  },
};
