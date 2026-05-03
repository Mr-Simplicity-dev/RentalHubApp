import api from './api';

export const courtBundleService = {
  // Create court bundle
  createCourtBundle: async (disputeId, bundleData) => {
    const response = await api.post(`/disputes/${disputeId}/court-bundle`, bundleData);
    return response.data;
  },

  // Get court bundle for a dispute
  getCourtBundle: async (disputeId) => {
    const response = await api.get(`/disputes/${disputeId}/court-bundle`);
    return response.data;
  },

  // Generate court bundle document
  generateCourtBundleDocument: async (disputeId) => {
    const response = await api.post(`/disputes/${disputeId}/court-bundle/generate`);
    return response.data;
  },

  // Download court bundle
  downloadCourtBundle: async (bundleId) => {
    const response = await api.get(`/court-bundle/${bundleId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Update court bundle status
  updateCourtBundleStatus: async (bundleId, status) => {
    const response = await api.patch(`/court-bundle/${bundleId}/status`, { status });
    return response.data;
  },

  // Add document to court bundle
  addDocumentToBundle: async (bundleId, documentData) => {
    const formData = new FormData();

    if (documentData.file) {
      formData.append('document', {
        uri: documentData.file.uri || documentData.file,
        type: documentData.file.type || 'application/pdf',
        name: documentData.file.fileName || 'document.pdf',
      });
    }

    if (documentData.document_type) {
      formData.append('document_type', documentData.document_type);
    }

    if (documentData.notes) {
      formData.append('notes', documentData.notes);
    }

    const response = await api.post(`/court-bundle/${bundleId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Remove document from court bundle
  removeDocumentFromBundle: async (bundleId, documentId) => {
    const response = await api.delete(`/court-bundle/${bundleId}/documents/${documentId}`);
    return response.data;
  },
};
