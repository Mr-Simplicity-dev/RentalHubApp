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

  getLegalAuditLogs: async (params = {}) => {
    const response = await api.get('/legal/audit-logs', { params });
    return response.data;
  },
};
