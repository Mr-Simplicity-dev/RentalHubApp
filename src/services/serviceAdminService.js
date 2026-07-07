import api from './api';
import { requestWithOfflineQueue } from './offlineActionQueueService';

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
    return requestWithOfflineQueue({
      method: 'patch',
      path: `/transportation-admin/bookings/${bookingId}/status`,
      data: payload,
      label: `Transportation booking #${bookingId} status update`,
    });
  },

  updateTransportationPaymentStatus: async (bookingId, payload = {}) => {
    return requestWithOfflineQueue({
      method: 'patch',
      path: `/transportation-admin/bookings/${bookingId}/payment-status`,
      data: payload,
      label: `Transportation booking #${bookingId} payment update`,
    });
  },

  getTransportationBookingOperations: async (bookingId) => {
    const response = await api.get(`/transportation-admin/bookings/${bookingId}/operations`);
    return response.data;
  },

  updateTransportationDispatch: async (bookingId, payload = {}) => {
    return requestWithOfflineQueue({
      method: 'patch',
      path: `/transportation-admin/bookings/${bookingId}/dispatch`,
      data: payload,
      label: `Transportation booking #${bookingId} dispatch update`,
    });
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
    return requestWithOfflineQueue({
      method: 'put',
      path: `/fumigation-cleaning/admin/bookings/${bookingId}/status`,
      data: payload,
      label: `Fumigation booking #${bookingId} status update`,
    });
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
    return requestWithOfflineQueue({
      method: 'post',
      path: `/fumigation-cleaning/admin/bookings/${bookingId}/assign-provider`,
      data: { provider_id: providerId },
      label: `Fumigation booking #${bookingId} provider assignment`,
    });
  },

  updateFumigationProviderLifecycle: async (bookingId, payload = {}) => {
    return requestWithOfflineQueue({
      method: 'patch',
      path: `/fumigation-cleaning/admin/bookings/${bookingId}/provider-lifecycle`,
      data: payload,
      label: `Fumigation booking #${bookingId} provider lifecycle update`,
    });
  },

  getFumigationComplianceRecord: async (bookingId) => {
    const response = await api.get(`/fumigation-cleaning/compliance/${bookingId}`);
    return response.data;
  },

  submitFumigationCompliance: async (bookingId, payload = {}) => {
    return requestWithOfflineQueue({
      method: 'post',
      path: `/fumigation-cleaning/admin/compliance/${bookingId}`,
      data: payload,
      label: `Fumigation booking #${bookingId} safety compliance`,
    });
  },
};
