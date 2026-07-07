import api from './api';

export const serviceAdminService = {
  getSupportTickets: async (params = {}) => {
    const response = await api.get('/support/tickets', { params });
    return response.data;
  },

  getTransportationDashboard: async () => {
    const response = await api.get('/transportation-admin/dashboard');
    return response.data;
  },

  getTransportationBookings: async (params = {}) => {
    const response = await api.get('/transportation-admin/bookings', { params });
    return response.data;
  },

  updateTransportationBookingStatus: async (bookingId, payload = {}) => {
    const response = await api.patch(`/transportation-admin/bookings/${bookingId}/status`, payload);
    return response.data;
  },

  updateTransportationPaymentStatus: async (bookingId, payload = {}) => {
    const response = await api.patch(`/transportation-admin/bookings/${bookingId}/payment-status`, payload);
    return response.data;
  },

  getTransportationBookingOperations: async (bookingId) => {
    const response = await api.get(`/transportation-admin/bookings/${bookingId}/operations`);
    return response.data;
  },

  updateTransportationDispatch: async (bookingId, payload = {}) => {
    const response = await api.patch(`/transportation-admin/bookings/${bookingId}/dispatch`, payload);
    return response.data;
  },

  getTransportationStateDashboard: async () => {
    const response = await api.get('/transportation-admin/state-admin/dashboard');
    return response.data;
  },

  getTransportationStateBookings: async (params = {}) => {
    const response = await api.get('/transportation-admin/state-admin/bookings', { params });
    return response.data;
  },

  getTransportationSuperDashboard: async () => {
    const response = await api.get('/transportation-admin/super-admin/dashboard');
    return response.data;
  },

  getFumigationStats: async () => {
    const response = await api.get('/fumigation-cleaning/admin/stats');
    return response.data;
  },

  getFumigationBookings: async (params = {}) => {
    const response = await api.get('/fumigation-cleaning/admin/bookings', { params });
    return response.data;
  },

  updateFumigationBookingStatus: async (bookingId, payload = {}) => {
    const response = await api.put(`/fumigation-cleaning/admin/bookings/${bookingId}/status`, payload);
    return response.data;
  },

  getFumigationBookingOperations: async (bookingId) => {
    const response = await api.get(`/fumigation-cleaning/admin/bookings/${bookingId}/operations`);
    return response.data;
  },

  getAvailableFumigationProviders: async (bookingId) => {
    const response = await api.get(`/fumigation-cleaning/admin/bookings/${bookingId}/available-providers`);
    return response.data;
  },

  assignFumigationProvider: async (bookingId, providerId) => {
    const response = await api.post(`/fumigation-cleaning/admin/bookings/${bookingId}/assign-provider`, {
      provider_id: providerId,
    });
    return response.data;
  },

  updateFumigationProviderLifecycle: async (bookingId, payload = {}) => {
    const response = await api.patch(`/fumigation-cleaning/admin/bookings/${bookingId}/provider-lifecycle`, payload);
    return response.data;
  },

  getFumigationComplianceRecord: async (bookingId) => {
    const response = await api.get(`/fumigation-cleaning/compliance/${bookingId}`);
    return response.data;
  },

  submitFumigationCompliance: async (bookingId, payload = {}) => {
    const response = await api.post(`/fumigation-cleaning/admin/compliance/${bookingId}`, payload);
    return response.data;
  },
};
