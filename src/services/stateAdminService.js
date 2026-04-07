import api from './api';

export const stateAdminService = {
  // Get state overview
  getStateOverview: async (stateId) => {
    const response = await api.get(`/state-admin/${stateId}/overview`);
    return response.data;
  },

  // Get state properties
  getStateProperties: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/properties`, { params });
    return response.data;
  },

  // Get state users
  getStateUsers: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/users`, { params });
    return response.data;
  },

  // Get state payments
  getStatePayments: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/payments`, { params });
    return response.data;
  },

  // Get state applications
  getStateApplications: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/applications`, { params });
    return response.data;
  },

  // Get state disputes
  getStateDisputes: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/disputes`, { params });
    return response.data;
  },

  // Get state compliance
  getStateCompliance: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/compliance`, { params });
    return response.data;
  },

  // Get state statistics
  getStateStatistics: async (stateId) => {
    const response = await api.get(`/state-admin/${stateId}/statistics`);
    return response.data;
  },

  // Get state revenue
  getStateRevenue: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/revenue`, { params });
    return response.data;
  },

  // Get state growth metrics
  getStateGrowthMetrics: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/growth`, { params });
    return response.data;
  },

  // Get state alerts
  getStateAlerts: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/alerts`, { params });
    return response.data;
  },

  // Create state alert
  createStateAlert: async (stateId, alertData) => {
    const response = await api.post(`/state-admin/${stateId}/alerts`, alertData);
    return response.data;
  },

  // Update state alert
  updateStateAlert: async (stateId, alertId, alertData) => {
    const response = await api.put(`/state-admin/${stateId}/alerts/${alertId}`, alertData);
    return response.data;
  },

  // Delete state alert
  deleteStateAlert: async (stateId, alertId) => {
    const response = await api.delete(`/state-admin/${stateId}/alerts/${alertId}`);
    return response.data;
  },

  // Get state settings
  getStateSettings: async (stateId) => {
    const response = await api.get(`/state-admin/${stateId}/settings`);
    return response.data;
  },

  // Update state settings
  updateStateSettings: async (stateId, settingsData) => {
    const response = await api.put(`/state-admin/${stateId}/settings`, settingsData);
    return response.data;
  },

  // Get state verification requests
  getStateVerificationRequests: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/verification-requests`, { params });
    return response.data;
  },

  // Process verification request
  processVerificationRequest: async (stateId, requestId, decisionData) => {
    const response = await api.post(`/state-admin/${stateId}/verification-requests/${requestId}/process`, decisionData);
    return response.data;
  },

  // Get state property approvals
  getStatePropertyApprovals: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/property-approvals`, { params });
    return response.data;
  },

  // Approve property
  approveProperty: async (stateId, propertyId, approvalData) => {
    const response = await api.post(`/state-admin/${stateId}/properties/${propertyId}/approve`, approvalData);
    return response.data;
  },

  // Reject property
  rejectProperty: async (stateId, propertyId, rejectionData) => {
    const response = await api.post(`/state-admin/${stateId}/properties/${propertyId}/reject`, rejectionData);
    return response.data;
  },

  // Get state user approvals
  getStateUserApprovals: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/user-approvals`, { params });
    return response.data;
  },

  // Approve user
  approveUser: async (stateId, userId, approvalData) => {
    const response = await api.post(`/state-admin/${stateId}/users/${userId}/approve`, approvalData);
    return response.data;
  },

  // Reject user
  rejectUser: async (stateId, userId, rejectionData) => {
    const response = await api.post(`/state-admin/${stateId}/users/${userId}/reject`, rejectionData);
    return response.data;
  },

  // Get state reports
  getStateReports: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/reports`, { params });
    return response.data;
  },

  // Generate state report
  generateStateReport: async (stateId, reportData) => {
    const response = await api.post(`/state-admin/${stateId}/reports/generate`, reportData, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get state audit trail
  getStateAuditTrail: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/audit-trail`, { params });
    return response.data;
  },

  // Get state notifications
  getStateNotifications: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/notifications`, { params });
    return response.data;
  },

  // Mark state notification as read
  markStateNotificationAsRead: async (stateId, notificationId) => {
    const response = await api.patch(`/state-admin/${stateId}/notifications/${notificationId}/read`);
    return response.data;
  },

  // Get state dashboard data
  getStateDashboardData: async (stateId) => {
    const response = await api.get(`/state-admin/${stateId}/dashboard`);
    return response.data;
  },

  // Get state activity log
  getStateActivityLog: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/activity-log`, { params });
    return response.data;
  },

  // Export state data
  exportStateData: async (stateId, exportData) => {
    const response = await api.post(`/state-admin/${stateId}/export`, exportData, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get state commission rates
  getStateCommissionRates: async (stateId) => {
    const response = await api.get(`/state-admin/${stateId}/commission-rates`);
    return response.data;
  },

  // Update state commission rates
  updateStateCommissionRates: async (stateId, ratesData) => {
    const response = await api.put(`/state-admin/${stateId}/commission-rates`, ratesData);
    return response.data;
  },

  // Get state tax rates
  getStateTaxRates: async (stateId) => {
    const response = await api.get(`/state-admin/${stateId}/tax-rates`);
    return response.data;
  },

  // Update state tax rates
  updateStateTaxRates: async (stateId, taxData) => {
    const response = await api.put(`/state-admin/${stateId}/tax-rates`, taxData);
    return response.data;
  },

  // Get state fee structure
  getStateFeeStructure: async (stateId) => {
    const response = await api.get(`/state-admin/${stateId}/fee-structure`);
    return response.data;
  },

  // Update state fee structure
  updateStateFeeStructure: async (stateId, feeData) => {
    const response = await api.put(`/state-admin/${stateId}/fee-structure`, feeData);
    return response.data;
  },

  // Get state performance metrics
  getStatePerformanceMetrics: async (stateId, params = {}) => {
    const response = await api.get(`/state-admin/${stateId}/performance`, { params });
    return response.data;
  },

  // Compare state performance
  compareStatePerformance: async (stateIds, params = {}) => {
    const response = await api.get('/state-admin/compare', {
      params: { states: stateIds.join(','), ...params },
    });
    return response.data;
  },
};