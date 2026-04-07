import api from './api';

export const legalService = {
  // Existing endpoints
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

  // New endpoints from backend
  getLegalTemplates: async (params = {}) => {
    const response = await api.get('/legal/templates', { params });
    return response.data;
  },

  getLegalTemplate: async (templateId) => {
    const response = await api.get(`/legal/templates/${templateId}`);
    return response.data;
  },

  generateLegalDocument: async (templateId, documentData) => {
    const response = await api.post(`/legal/templates/${templateId}/generate`, documentData);
    return response.data;
  },

  getUserLegalDocuments: async (params = {}) => {
    const response = await api.get('/legal/documents', { params });
    return response.data;
  },

  getLegalDocument: async (documentId) => {
    const response = await api.get(`/legal/documents/${documentId}`);
    return response.data;
  },

  signLegalDocument: async (documentId, signatureData) => {
    const formData = new FormData();
    
    if (signatureData.signatureImage) {
      formData.append('signature', {
        uri: signatureData.signatureImage.uri,
        type: signatureData.signatureImage.type || 'image/png',
        name: signatureData.signatureImage.fileName || 'signature.png',
      });
    }
    
    if (signatureData.signatureText) {
      formData.append('signatureText', signatureData.signatureText);
    }
    
    formData.append('signerName', signatureData.signerName);
    formData.append('signerEmail', signatureData.signerEmail);
    formData.append('signerPhone', signatureData.signerPhone || '');
    
    const response = await api.post(`/legal/documents/${documentId}/sign`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  verifyDocumentSignature: async (documentId) => {
    const response = await api.get(`/legal/documents/${documentId}/verify`);
    return response.data;
  },

  downloadLegalDocument: async (documentId, format = 'pdf') => {
    const response = await api.get(`/legal/documents/${documentId}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  getLegalAdvice: async (queryData) => {
    const response = await api.post('/legal/advice', queryData);
    return response.data;
  },

  scheduleLegalConsultation: async (consultationData) => {
    const response = await api.post('/legal/consultations', consultationData);
    return response.data;
  },

  getLegalConsultations: async (params = {}) => {
    const response = await api.get('/legal/consultations', { params });
    return response.data;
  },

  updateConsultationStatus: async (consultationId, statusData) => {
    const response = await api.patch(`/legal/consultations/${consultationId}/status`, statusData);
    return response.data;
  },

  getLegalResources: async (params = {}) => {
    const response = await api.get('/legal/resources', { params });
    return response.data;
  },

  submitLegalInquiry: async (inquiryData) => {
    const response = await api.post('/legal/inquiries', inquiryData);
    return response.data;
  },

  getLegalStatistics: async () => {
    const response = await api.get('/legal/statistics');
    return response.data;
  },
};
