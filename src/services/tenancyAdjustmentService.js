import api from './api';

export const tenancyAdjustmentService = {
  getEligibleGracePayments: async () => {
    const response = await api.get('/payments/tenancy-adjustments/grace/eligible');
    return response.data;
  },

  getMyGraceRequests: async () => {
    const response = await api.get('/payments/tenancy-adjustments/grace/my-requests');
    return response.data;
  },

  requestGracePeriod: async (payload) => {
    const response = await api.post('/payments/tenancy-adjustments/grace/request', payload);
    return response.data;
  },

  getLandlordGraceRequests: async (status = 'pending') => {
    const response = await api.get('/payments/tenancy-adjustments/grace/landlord', {
      params: { status },
    });
    return response.data;
  },

  respondToGraceRequest: async (requestId, payload) => {
    const response = await api.put(
      `/payments/tenancy-adjustments/grace/${requestId}/respond`,
      payload
    );
    return response.data;
  },

  getAdminGraceRequests: async (params = {}) => {
    const response = await api.get('/payments/tenancy-adjustments/admin', { params });
    return response.data;
  },

  reviewAdminGraceRequest: async (requestId, payload) => {
    const response = await api.put(
      `/payments/tenancy-adjustments/admin/${requestId}/review`,
      payload
    );
    return response.data;
  },

  getAdminRelocationRefunds: async (params = {}) => {
    const response = await api.get('/payments/refund/admin/all', { params });
    return response.data;
  },

  reviewAdminRelocationRefund: async (refundId, payload) => {
    const response = await api.put(`/payments/refund/admin/${refundId}/review`, payload);
    return response.data;
  },
};
