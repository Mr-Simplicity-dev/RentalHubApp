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
};
