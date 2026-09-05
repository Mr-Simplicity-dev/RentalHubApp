import api from './api';

export const superModerationService = {
  listRatings: async () => {
    const response = await api.get('/super/platform-ratings');
    return response.data;
  },

  moderateRating: async (ratingId, payload) => {
    const response = await api.patch(`/super/platform-ratings/${ratingId}/moderate`, payload);
    return response.data;
  },

  listCredentialRevalidations: async () => {
    const response = await api.get('/super/credential-revalidations');
    return response.data;
  },

  reviewCredentialRevalidation: async (requestId, payload) => {
    const response = await api.patch(`/super/credential-revalidations/${requestId}/review`, payload);
    return response.data;
  },
};
