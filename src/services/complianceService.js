import api from './api';

export const complianceService = {
  // Existing endpoints
  getOverview: async () => {
    const response = await api.get('/compliance/overview');
    return response.data;
  },

  getRiskTrend: async () => {
    const response = await api.get('/compliance/risk-trend');
    return response.data;
  },

  // New endpoints from backend
  getComplianceRequirements: async (params = {}) => {
    const response = await api.get('/compliance/requirements', { params });
    return response.data;
  },

  submitComplianceDocument: async (documentData) => {
    const formData = new FormData();
    
    Object.keys(documentData).forEach(key => {
      if (key === 'documentFile' && documentData[key]) {
        const file = documentData[key];
        formData.append('document', {
          uri: file.uri || file,
          type: file.type || 'application/pdf',
          name: file.fileName || 'compliance_document.pdf',
        });
      } else if (documentData[key] !== undefined && documentData[key] !== null) {
        formData.append(key, documentData[key]);
      }
    });

    const response = await api.post('/compliance/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getUserComplianceDocuments: async (params = {}) => {
    const response = await api.get('/compliance/documents', { params });
    return response.data;
  },

  getComplianceDocument: async (documentId) => {
    const response = await api.get(`/compliance/documents/${documentId}`);
    return response.data;
  },

  updateComplianceDocumentStatus: async (documentId, statusData) => {
    const response = await api.patch(`/compliance/documents/${documentId}/status`, statusData);
    return response.data;
  },

  getComplianceAudits: async (params = {}) => {
    const response = await api.get('/compliance/audits', { params });
    return response.data;
  },

  scheduleComplianceAudit: async (auditData) => {
    const response = await api.post('/compliance/audits', auditData);
    return response.data;
  },

  getComplianceStatistics: async () => {
    const response = await api.get('/compliance/statistics');
    return response.data;
  },

  submitViolationReport: async (reportData) => {
    const formData = new FormData();
    
    Object.keys(reportData).forEach(key => {
      if (key === 'evidenceFiles' && Array.isArray(reportData[key])) {
        reportData[key].forEach((file, index) => {
          formData.append('evidence', {
            uri: file.uri || file,
            type: file.type || 'image/jpeg',
            name: file.fileName || `evidence_${index}.jpg`,
          });
        });
      } else if (reportData[key] !== undefined && reportData[key] !== null) {
        formData.append(key, reportData[key]);
      }
    });

    const response = await api.post('/compliance/violations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getComplianceViolations: async (params = {}) => {
    const response = await api.get('/compliance/violations', { params });
    return response.data;
  },

  updateViolationStatus: async (violationId, statusData) => {
    const response = await api.patch(`/compliance/violations/${violationId}/status`, statusData);
    return response.data;
  },

  getComplianceNotifications: async (params = {}) => {
    const response = await api.get('/compliance/notifications', { params });
    return response.data;
  },

  markNotificationAsRead: async (notificationId) => {
    const response = await api.patch(`/compliance/notifications/${notificationId}/read`);
    return response.data;
  },

  getComplianceChecklist: async (checklistType) => {
    const response = await api.get('/compliance/checklist', {
      params: { type: checklistType },
    });
    return response.data;
  },

  submitChecklistCompletion: async (checklistData) => {
    const response = await api.post('/compliance/checklist/complete', checklistData);
    return response.data;
  },

  getComplianceTraining: async (params = {}) => {
    const response = await api.get('/compliance/training', { params });
    return response.data;
  },

  completeTrainingModule: async (moduleId, completionData) => {
    const response = await api.post(`/compliance/training/${moduleId}/complete`, completionData);
    return response.data;
  },

  getComplianceCertificates: async (params = {}) => {
    const response = await api.get('/compliance/certificates', { params });
    return response.data;
  },

  downloadComplianceCertificate: async (certificateId, format = 'pdf') => {
    const response = await api.get(`/compliance/certificates/${certificateId}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};
