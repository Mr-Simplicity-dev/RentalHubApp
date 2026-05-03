import api from './api';

export const documentSignatureService = {
  // Create signature request
  createSignatureRequest: async (documentData) => {
    const response = await api.post('/signatures/request', documentData);
    return response.data;
  },

  // Get signature request details
  getSignatureRequest: async (requestId) => {
    const response = await api.get(`/signatures/request/${requestId}`);
    return response.data;
  },

  // List signature requests
  listSignatureRequests: async (params) => {
    const response = await api.get('/signatures/requests', { params });
    return response.data;
  },

  // Sign a document
  signDocument: async (requestId, signatureData) => {
    const formData = new FormData();

    if (signatureData.signature_image) {
      formData.append('signature_image', {
        uri: signatureData.signature_image.uri || signatureData.signature_image,
        type: signatureData.signature_image.type || 'image/png',
        name: signatureData.signature_image.fileName || 'signature.png',
      });
    }

    if (signatureData.metadata) {
      formData.append('metadata', JSON.stringify(signatureData.metadata));
    }

    const response = await api.post(`/signatures/request/${requestId}/sign`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Verify a signature
  verifySignature: async (signatureId) => {
    const response = await api.get(`/signatures/${signatureId}/verify`);
    return response.data;
  },

  // Get signature history for a dispute
  getSignatureHistory: async (disputeId) => {
    const response = await api.get(`/signatures/dispute/${disputeId}/history`);
    return response.data;
  },

  // Decline to sign
  declineSignature: async (requestId, reason) => {
    const response = await api.post(`/signatures/request/${requestId}/decline`, { reason });
    return response.data;
  },

  // Resend signature request
  resendSignatureRequest: async (requestId) => {
    const response = await api.post(`/signatures/request/${requestId}/resend`);
    return response.data;
  },
};
