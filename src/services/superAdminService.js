import api from './api';

export const superAdminService = {
  // ===================== USERS =====================
  getUsers: async () => {
    const response = await api.get('/super/users');
    return response.data;
  },

  banUser: async (id, reason) => {
    const response = await api.patch(`/super/users/${id}/ban`, { reason });
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

  bulkUserAction: async (ids, action) => {
    const response = await api.post('/super/users/bulk', { ids, action });
    return response.data;
  },

  impersonateAdmin: async (id) => {
    const response = await api.post(`/super/admins/${id}/impersonate`);
    return response.data;
  },

  // ===================== PROPERTIES =====================
  getProperties: async () => {
    const response = await api.get('/super/properties');
    return response.data;
  },

  unlistProperty: async (id) => {
    const response = await api.patch(`/super/properties/${id}/unlist`);
    return response.data;
  },

  featureProperty: async (id) => {
    const response = await api.patch(`/super/properties/${id}/feature`);
    return response.data;
  },

  unfeatureProperty: async (id) => {
    const response = await api.patch(`/super/properties/${id}/unfeature`);
    return response.data;
  },

  bulkPropertyAction: async (ids, action) => {
    const response = await api.post('/super/properties/bulk', { ids, action });
    return response.data;
  },

  // ===================== IDENTITY VERIFICATIONS =====================
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

  getAdminStateUsers: async (adminId) => {
    const response = await api.get(`/super/admins/${adminId}/state-users`);
    return response.data;
  },

  updateAdminJurisdiction: async (adminId, assignedState, assignedCity) => {
    const response = await api.patch(`/super/admins/${adminId}/jurisdiction`, {
      assigned_state: assignedState,
      assigned_city: assignedCity,
    });
    return response.data;
  },

  // ===================== ANALYTICS =====================
  getAnalytics: async () => {
    const response = await api.get('/super/analytics');
    return response.data;
  },

  // ===================== REPORTS =====================
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

  // ===================== AUDIT LOGS =====================
  getLogs: async () => {
    const response = await api.get('/super/logs');
    return response.data;
  },

  // ===================== BROADCASTS =====================
  getBroadcasts: async () => {
    const response = await api.get('/super/broadcasts');
    return response.data;
  },

  createBroadcast: async (payload) => {
    const response = await api.post('/super/broadcasts', payload);
    return response.data;
  },

  // ===================== FEATURE FLAGS =====================
  getFlags: async () => {
    const response = await api.get('/super/flags');
    return response.data;
  },

  updateFlag: async (key, enabled) => {
    const response = await api.patch(`/super/flags/${key}`, { enabled });
    return response.data;
  },

  // ===================== PRICING RULES =====================
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

  // ===================== FRAUD FLAGS =====================
  getFraudFlags: async () => {
    const response = await api.get('/super/fraud');
    return response.data;
  },

  resolveFraudFlag: async (id) => {
    const response = await api.patch(`/super/fraud/${id}/resolve`);
    return response.data;
  },

  // ===================== PLATFORM LAWYERS =====================
  getPlatformLawyers: async () => {
    const response = await api.get('/super/platform-lawyers');
    return response.data;
  },

  createManualPlatformLawyer: async (payload) => {
    const response = await api.post('/super/platform-lawyers/manual', payload);
    return response.data;
  },

  resendPlatformLawyerInvite: async (lawyerId) => {
    const response = await api.post(`/super/platform-lawyers/${lawyerId}/resend-invite`);
    return response.data;
  },

  updatePlatformLawyer: async (lawyerId, payload) => {
    const response = await api.patch(`/super/platform-lawyers/${lawyerId}`, payload);
    return response.data;
  },

  deletePlatformLawyer: async (lawyerId) => {
    const response = await api.delete(`/super/platform-lawyers/${lawyerId}`);
    return response.data;
  },

  createPlatformLawyerRecruitmentBroadcast: async (payload) => {
    const response = await api.post('/super/platform-lawyers/broadcast', payload);
    return response.data;
  },

  approvePlatformLawyerApplication: async (applicationId, reviewNote) => {
    const response = await api.patch(`/super/platform-lawyers/applications/${applicationId}/approve`, {
      review_note: reviewNote,
    });
    return response.data;
  },

  rejectPlatformLawyerApplication: async (applicationId, reviewNote) => {
    const response = await api.patch(`/super/platform-lawyers/applications/${applicationId}/reject`, {
      review_note: reviewNote,
    });
    return response.data;
  },

  // ===================== LAWYER ACTIVITIES =====================
  getLawyerActivities: async (timeRange = '7days') => {
    const response = await api.get('/super/lawyer-activities', {
      params: { time_range: timeRange },
    });
    return response.data;
  },

  // ===================== PENDING ADMIN APPROVALS =====================
  getPendingAdmins: async () => {
    const response = await api.get('/super/pending-admins');
    return response.data;
  },

  approvePendingAdmin: async (id) => {
    const response = await api.patch(`/super/pending-admins/${id}/approve`);
    return response.data;
  },

  rejectPendingAdmin: async (id) => {
    const response = await api.patch(`/super/pending-admins/${id}/reject`);
    return response.data;
  },

  // ===================== SFA DELEGATION PERMISSIONS =====================
  getSFAPermissions: async () => {
    const response = await api.get('/super/sfa-permissions');
    return response.data;
  },

  updateSFAPermission: async (sfaId, permissions) => {
    const response = await api.patch(`/super/sfa-permissions/${sfaId}`, permissions);
    return response.data;
  },

  // ===================== SUPER ADMIN DIRECT WITHDRAWAL =====================
  withdrawDirect: async (payload) => {
    const response = await api.post('/super/withdraw/direct', payload);
    return response.data;
  },
};
