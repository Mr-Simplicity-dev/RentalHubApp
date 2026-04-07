import api from './api';

export const exportService = {
  // Export properties data
  exportProperties: async (filters = {}, format = 'csv') => {
    const response = await api.get('/export/properties', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Export users data
  exportUsers: async (filters = {}, format = 'csv') => {
    const response = await api.get('/export/users', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Export payments data
  exportPayments: async (filters = {}, format = 'csv') => {
    const response = await api.get('/export/payments', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Export applications data
  exportApplications: async (filters = {}, format = 'csv') => {
    const response = await api.get('/export/applications', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Export disputes data
  exportDisputes: async (filters = {}, format = 'csv') => {
    const response = await api.get('/export/disputes', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Export dispute bundle (admin only)
  exportDisputeBundle: async (disputeId, format = 'pdf') => {
    const response = await api.get(`/export/dispute/${disputeId}`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Export compliance data
  exportCompliance: async (filters = {}, format = 'csv') => {
    const response = await api.get('/export/compliance', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Export financial data
  exportFinancialData: async (filters = {}, format = 'csv') => {
    const response = await api.get('/export/financial', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Export audit logs
  exportAuditLogs: async (filters = {}, format = 'csv') => {
    const response = await api.get('/export/audit-logs', {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Generate custom report
  generateCustomReport: async (reportConfig) => {
    const response = await api.post('/export/custom-report', reportConfig, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get export templates
  getExportTemplates: async () => {
    const response = await api.get('/export/templates');
    return response.data;
  },

  // Save export template
  saveExportTemplate: async (templateData) => {
    const response = await api.post('/export/templates', templateData);
    return response.data;
  },

  // Delete export template
  deleteExportTemplate: async (templateId) => {
    const response = await api.delete(`/export/templates/${templateId}`);
    return response.data;
  },

  // Get export history
  getExportHistory: async (params = {}) => {
    const response = await api.get('/export/history', { params });
    return response.data;
  },

  // Download exported file
  downloadExportFile: async (exportId) => {
    const response = await api.get(`/export/download/${exportId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delete exported file
  deleteExportFile: async (exportId) => {
    const response = await api.delete(`/export/files/${exportId}`);
    return response.data;
  },

  // Get export statistics
  getExportStatistics: async () => {
    const response = await api.get('/export/statistics');
    return response.data;
  },

  // Schedule automated export
  scheduleAutomatedExport: async (scheduleData) => {
    const response = await api.post('/export/schedule', scheduleData);
    return response.data;
  },

  // Get export schedules
  getExportSchedules: async () => {
    const response = await api.get('/export/schedules');
    return response.data;
  },

  // Update export schedule
  updateExportSchedule: async (scheduleId, scheduleData) => {
    const response = await api.put(`/export/schedules/${scheduleId}`, scheduleData);
    return response.data;
  },

  // Delete export schedule
  deleteExportSchedule: async (scheduleId) => {
    const response = await api.delete(`/export/schedules/${scheduleId}`);
    return response.data;
  },

  // Test export configuration
  testExportConfiguration: async (configData) => {
    const response = await api.post('/export/test', configData);
    return response.data;
  },

  // Get export formats
  getExportFormats: async () => {
    const response = await api.get('/export/formats');
    return response.data;
  },

  // Validate export data
  validateExportData: async (validationData) => {
    const response = await api.post('/export/validate', validationData);
    return response.data;
  },
};