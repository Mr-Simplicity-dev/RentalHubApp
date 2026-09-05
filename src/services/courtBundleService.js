import api from './api';

export const courtBundleService = {
  download: async (disputeId) => {
    const response = await api.get(`/disputes/${disputeId}/court-bundle`, {
      responseType: 'arraybuffer',
    });
    return response.data;
  },
};
