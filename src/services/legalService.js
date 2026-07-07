import api from './api';

export const legalService = {
  getAuthorizedProperties: async () => {
    const response = await api.get('/legal/properties');
    return response.data;
  },

  getPropertyDisputes: async (propertyId) => {
    const response = await api.get(`/legal/property/${propertyId}/disputes`);
    return response.data;
  },

  resolveDispute: async (disputeId) => {
    const response = await api.patch(`/legal/disputes/${disputeId}/resolve`);
    return response.data;
  },

  getDisputeDetails: async (disputeId) => {
    const response = await api.get(`/disputes/${disputeId}`);
    return response.data;
  },

  getPublicLawyerDirectory: async () => {
    const response = await api.get('/legal/directory');
    return response.data;
  },

  getUnlockedLawyerDirectory: async () => {
    const response = await api.get('/legal/directory/full');
    return response.data;
  },

  getCoverageStatus: async () => {
    const response = await api.get('/legal/coverage-status');
    return response.data;
  },

  getMySupportRequests: async () => {
    const response = await api.get('/legal/my-requests');
    return response.data;
  },

  submitSupportRequest: async ({ subject, description, urgency }) => {
    const response = await api.post('/legal/request-help', {
      subject,
      description,
      message: description,
      urgency,
    });
    return response.data;
  },
};
