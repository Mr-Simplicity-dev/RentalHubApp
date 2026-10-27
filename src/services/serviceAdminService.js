import { translateUi as ui } from '../i18n/interfaceRuntime.cjs';
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
      label: ui("Transportation booking #{value0} status update", {value0: (bookingId)}),
    });
  },

  updateTransportationPaymentStatus: async (bookingId, payload = {}) => {
    return requestWithOfflineQueue({
      method: 'patch',
      path: `/transportation-admin/bookings/${bookingId}/payment-status`,
      data: payload,
      label: ui("Transportation booking #{value0} payment update", {value0: (bookingId)}),
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
      label: ui("Transportation booking #{value0} dispatch update", {value0: (bookingId)}),
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
      label: ui("Fumigation booking #{value0} status update", {value0: (bookingId)}),
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
      label: ui("Fumigation booking #{value0} provider assignment", {value0: (bookingId)}),
    });
  },

  updateFumigationProviderLifecycle: async (bookingId, payload = {}) => {
    return requestWithOfflineQueue({
      method: 'patch',
      path: `/fumigation-cleaning/admin/bookings/${bookingId}/provider-lifecycle`,
      data: payload,
      label: ui("Fumigation booking #{value0} provider lifecycle update", {value0: (bookingId)}),
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
      label: ui("Fumigation booking #{value0} safety compliance", {value0: (bookingId)}),
    });
  },
};
