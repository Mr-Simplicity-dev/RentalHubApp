import api from './api';

export const propertyAlertAdminService = {
  listRequests: async (params = {}) => {
    const response = await api.get('/property-alerts/admin/requests', { params });
    return response.data;
  },

  supportReview: async (requestId, payload) => {
    const response = await api.patch(
      `/property-alerts/admin/requests/${requestId}/support-review`,
      payload
    );
    return response.data;
  },

  stateAction: async (requestId, payload) => {
    const response = await api.patch(
      `/property-alerts/admin/requests/${requestId}/state-action`,
      payload
    );
    return response.data;
  },

  resendNotifications: async (requestId, payload = {}) => {
    const response = await api.post(
      `/property-alerts/admin/requests/${requestId}/resend-notifications`,
      payload
    );
    return response.data;
  },
};
