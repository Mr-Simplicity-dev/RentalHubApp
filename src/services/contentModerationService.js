import api from './api';

export const contentModerationService = {
  getFlaggedMessages: async () => {
    const response = await api.get('/messages/flagged');
    return response.data;
  },

  clearFlaggedMessage: async (messageId) => {
    const response = await api.patch(`/messages/flagged/${messageId}/clear`);
    return response.data;
  },

  getAdminDamageReports: async () => {
    const response = await api.get('/damage-reports/admin');
    return response.data;
  },

  getPropertyDamageReports: async (propertyId) => {
    const response = await api.get(
      `/damage-reports/properties/${propertyId}/damage-reports`
    );
    return response.data;
  },

  publishDamageReport: async (reportId) => {
    const response = await api.post(`/damage-reports/${reportId}/publish`);
    return response.data;
  },

  unpublishDamageReport: async (reportId) => {
    const response = await api.post(`/damage-reports/${reportId}/unpublish`);
    return response.data;
  },
};
