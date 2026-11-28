import api from './api';

export const listingAssistanceService = {
  getStatus: async () => {
    const response = await api.get('/listing-assistance/requests/mine');
    return response.data;
  },

  createRequest: async ({ stateId, lgaName, propertyId = null }) => {
    const response = await api.post('/listing-assistance/requests', {
      stateId,
      lgaName,
      ...(propertyId ? { propertyId } : {}),
    });
    return response.data;
  },
};
