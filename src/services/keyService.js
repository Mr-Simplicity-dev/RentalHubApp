import api from './api';

export const keyService = {
  // Request digital keys for a property
  requestDigitalKeys: async (propertyId) => {
    const response = await api.post(`/keys/request`, { property_id: propertyId });
    return response.data;
  },

  // Get user's digital keys
  getMyKeys: async (params = {}) => {
    const response = await api.get('/keys', { params });
    return response.data;
  },

  // Get key details
  getKeyDetails: async (keyId) => {
    const response = await api.get(`/keys/${keyId}`);
    return response.data;
  },

  // Activate a digital key
  activateKey: async (keyId) => {
    const response = await api.post(`/keys/${keyId}/activate`);
    return response.data;
  },

  // Deactivate a digital key
  deactivateKey: async (keyId) => {
    const response = await api.post(`/keys/${keyId}/deactivate`);
    return response.data;
  },

  // Share key with another user
  shareKey: async (keyId, shareData) => {
    const response = await api.post(`/keys/${keyId}/share`, shareData);
    return response.data;
  },

  // Revoke shared key access
  revokeKeyAccess: async (keyId, sharedKeyId) => {
    const response = await api.delete(`/keys/${keyId}/share/${sharedKeyId}`);
    return response.data;
  },

  // Get key access logs
  getKeyAccessLogs: async (keyId, params = {}) => {
    const response = await api.get(`/keys/${keyId}/logs`, { params });
    return response.data;
  },

  // Schedule key access
  scheduleKeyAccess: async (keyId, scheduleData) => {
    const response = await api.post(`/keys/${keyId}/schedule`, scheduleData);
    return response.data;
  },

  // Revoke key
  revokeKey: async (keyId, reason) => {
    const response = await api.delete(`/keys/${keyId}/revoke`, {
      data: { reason },
    });
    return response.data;
  },

  // Get key templates (admin)
  getKeyTemplates: async () => {
    const response = await api.get('/keys/admin/templates');
    return response.data;
  },

  // Create key template (admin)
  createKeyTemplate: async (templateData) => {
    const response = await api.post('/keys/admin/templates', templateData);
    return response.data;
  },

  // Get all keys (admin)
  getAllKeys: async (params = {}) => {
    const response = await api.get('/keys/admin/all', { params });
    return response.data;
  },

  // Get key statistics
  getKeyStatistics: async () => {
    const response = await api.get('/keys/admin/statistics');
    return response.data;
  },
};
