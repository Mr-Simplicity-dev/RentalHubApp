import api from './api';

export const evidenceService = {
  verifyDispute: async (disputeId) => {
    const response = await api.get(`/evidence/verify/dispute/${disputeId}`);
    return response.data;
  },
};
