import api from './api';

export const disputeService = {
  // Create a new dispute
  createDispute: async (disputeData) => {
    const response = await api.post('/disputes', disputeData);
    return response.data;
  },

  // Get disputes for a property
  getDisputes: async (propertyId) => {
    const response = await api.get(`/disputes/property/${propertyId}`);
    return response.data;
  },

  // Get dispute details
  getDisputeDetails: async (disputeId) => {
    const response = await api.get(`/disputes/${disputeId}`);
    return response.data;
  },

  // Add message to dispute
  addDisputeMessage: async (disputeId, messageData) => {
    const response = await api.post(`/disputes/${disputeId}/messages`, messageData);
    return response.data;
  },

  // Resolve dispute (admin only)
  resolveDispute: async (disputeId, resolutionData) => {
    const response = await api.patch(`/disputes/${disputeId}/resolve`, resolutionData);
    return response.data;
  },

  // Upload evidence
  uploadEvidence: async (disputeId, evidenceData) => {
    const formData = new FormData();
    
    Object.keys(evidenceData).forEach(key => {
      if (key === 'file' && evidenceData[key]) {
        const file = evidenceData[key];
        formData.append('file', {
          uri: file.uri || file,
          type: file.type || 'application/octet-stream',
          name: file.fileName || 'evidence_file',
        });
      } else if (evidenceData[key] !== undefined && evidenceData[key] !== null) {
        formData.append(key, evidenceData[key]);
      }
    });

    const response = await api.post(`/disputes/${disputeId}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // List dispute evidence
  listDisputeEvidence: async (disputeId) => {
    const response = await api.get(`/disputes/${disputeId}/evidence`);
    return response.data;
  },

  // Get evidence details
  getEvidence: async (evidenceId) => {
    const response = await api.get(`/disputes/evidence/${evidenceId}`);
    return response.data;
  },

  // Verify evidence integrity
  verifyEvidenceIntegrity: async (evidenceId) => {
    const response = await api.get(`/disputes/evidence/${evidenceId}/verify`);
    return response.data;
  },

  // Get user disputes
  getUserDisputes: async (params = {}) => {
    const response = await api.get('/disputes/user/my-disputes', { params });
    return response.data;
  },

  // Update dispute status
  updateDisputeStatus: async (disputeId, statusData) => {
    const response = await api.patch(`/disputes/${disputeId}/status`, statusData);
    return response.data;
  },

  // Add dispute participant
  addDisputeParticipant: async (disputeId, participantData) => {
    const response = await api.post(`/disputes/${disputeId}/participants`, participantData);
    return response.data;
  },

  // Remove dispute participant
  removeDisputeParticipant: async (disputeId, participantId) => {
    const response = await api.delete(`/disputes/${disputeId}/participants/${participantId}`);
    return response.data;
  },

  // Get dispute timeline
  getDisputeTimeline: async (disputeId) => {
    const response = await api.get(`/disputes/${disputeId}/timeline`);
    return response.data;
  },

  // Export dispute data
  exportDisputeData: async (disputeId, format = 'pdf') => {
    const response = await api.get(`/disputes/${disputeId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};