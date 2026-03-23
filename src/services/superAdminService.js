import api from './api';

export const superAdminService = {
  getUsers: async () => {
    const response = await api.get('/super/users');
    return response.data;
  },

  banUser: async (id) => {
    const response = await api.patch(`/super/users/${id}/ban`);
    return response.data;
  },

  unbanUser: async (id) => {
    const response = await api.patch(`/super/users/${id}/unban`);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/super/users/${id}`);
    return response.data;
  },

  promoteUser: async (id) => {
    const response = await api.patch(`/super/users/${id}/promote`);
    return response.data;
  },

  getProperties: async () => {
    const response = await api.get('/super/properties');
    return response.data;
  },

  unlistProperty: async (id) => {
    const response = await api.patch(`/super/properties/${id}/unlist`);
    return response.data;
  },

  getVerifications: async (params = {}) => {
    const response = await api.get('/super/verifications', { params });
    return response.data;
  },

  approveVerification: async (id) => {
    const response = await api.patch(`/super/verifications/${id}/approve`);
    return response.data;
  },

  rejectVerification: async (id) => {
    const response = await api.patch(`/super/verifications/${id}/reject`);
    return response.data;
  },

  deleteRejectedVerification: async (id) => {
    const response = await api.delete(`/super/verifications/${id}`);
    return response.data;
  },

  getAdminsPerformance: async () => {
    const response = await api.get('/super/admins/performance');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/super/analytics');
    return response.data;
  },

  getReports: async () => {
    const response = await api.get('/super/reports');
    return response.data;
  },

  updateReportStatus: async (id, status) => {
    const response = await api.patch(`/super/reports/${id}`, { status });
    return response.data;
  },

  resolveReport: async (id) => {
    const response = await api.patch(`/super/reports/${id}/resolve`);
    return response.data;
  },

  getLogs: async () => {
    const response = await api.get('/super/logs');
    return response.data;
  },

  getBroadcasts: async () => {
    const response = await api.get('/super/broadcasts');
    return response.data;
  },

  createBroadcast: async (payload) => {
    const response = await api.post('/super/broadcasts', payload);
    return response.data;
  },

  getFlags: async () => {
    const response = await api.get('/super/flags');
    return response.data;
  },

  updateFlag: async (key, enabled) => {
    const response = await api.patch(`/super/flags/${key}`, { enabled });
    return response.data;
  },

  getPricingRules: async () => {
    const response = await api.get('/super/pricing-rules');
    return response.data;
  },

  createPricingRule: async (payload) => {
    const response = await api.post('/super/pricing-rules', payload);
    return response.data;
  },

  updatePricingRule: async (ruleId, payload) => {
    const response = await api.patch(`/super/pricing-rules/${ruleId}`, payload);
    return response.data;
  },

  deletePricingRule: async (ruleId) => {
    const response = await api.delete(`/super/pricing-rules/${ruleId}`);
    return response.data;
  },

  getFraudFlags: async () => {
    const response = await api.get('/super/fraud');
    return response.data;
  },

  resolveFraudFlag: async (id) => {
    const response = await api.patch(`/super/fraud/${id}/resolve`);
    return response.data;
  },

  bulkUserAction: async (ids, action) => {
    const response = await api.post('/super/users/bulk', { ids, action });
    return response.data;
  },

  bulkPropertyAction: async (ids, action) => {
    const response = await api.post('/super/properties/bulk', { ids, action });
    return response.data;
  },
};
