import api from './api';

export const fraudEngineService = {
  // Check application fraud risk
  checkApplicationFraud: async (applicationId) => {
    const response = await api.get(`/fraud-engine/applications/${applicationId}/check`);
    return response.data;
  },

  // Check user fraud risk
  checkUserFraud: async (userId) => {
    const response = await api.get(`/fraud-engine/users/${userId}/check`);
    return response.data;
  },

  // Get fraud analysis for a property
  getPropertyFraudAnalysis: async (propertyId) => {
    const response = await api.get(`/fraud-engine/properties/${propertyId}/analysis`);
    return response.data;
  },

  // Report suspicious activity
  reportSuspiciousActivity: async (reportData) => {
    const response = await api.post('/fraud-engine/reports', reportData);
    return response.data;
  },

  // Get fraud statistics
  getFraudStatistics: async (params = {}) => {
    const response = await api.get('/fraud-engine/statistics', { params });
    return response.data;
  },

  // Get fraud alerts
  getFraudAlerts: async (params = {}) => {
    const response = await api.get('/fraud-engine/alerts', { params });
    return response.data;
  },

  // Resolve fraud alert
  resolveFraudAlert: async (alertId, resolutionData) => {
    const response = await api.post(`/fraud-engine/alerts/${alertId}/resolve`, resolutionData);
    return response.data;
  },

  // Get flagged users
  getFlaggedUsers: async (params = {}) => {
    const response = await api.get('/fraud-engine/flagged-users', { params });
    return response.data;
  },

  // Get flagged properties
  getFlaggedProperties: async (params = {}) => {
    const response = await api.get('/fraud-engine/flagged-properties', { params });
    return response.data;
  },

  // Get fraud detection rules
  getFraudRules: async () => {
    const response = await api.get('/fraud-engine/rules');
    return response.data;
  },

  // Update fraud detection rule
  updateFraudRule: async (ruleId, ruleData) => {
    const response = await api.put(`/fraud-engine/rules/${ruleId}`, ruleData);
    return response.data;
  },

  // Create fraud detection rule
  createFraudRule: async (ruleData) => {
    const response = await api.post('/fraud-engine/rules', ruleData);
    return response.data;
  },

  // Delete fraud detection rule
  deleteFraudRule: async (ruleId) => {
    const response = await api.delete(`/fraud-engine/rules/${ruleId}`);
    return response.data;
  },

  // Run manual fraud check
  runManualFraudCheck: async (entityType, entityId) => {
    const response = await api.post(`/fraud-engine/manual-check`, {
      entity_type: entityType,
      entity_id: entityId,
    });
    return response.data;
  },

  // Get fraud audit log
  getFraudAuditLog: async (params = {}) => {
    const response = await api.get('/fraud-engine/audit-log', { params });
    return response.data;
  },
};
