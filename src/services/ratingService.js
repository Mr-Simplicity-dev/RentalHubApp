import api from './api';

export const ratingService = {
  getRatingOpportunities: async () => {
    const response = await api.get('/platform-ratings/opportunities');
    return response.data;
  },

  submitRating: async ({ stars, comment, rating_context, source_type, source_ref, display_name_mode }) => {
    const response = await api.post('/platform-ratings', {
      stars,
      comment,
      rating_context,
      source_type,
      source_ref,
      display_name_mode,
    });
    return response.data;
  },

  getPublicRatings: async ({ context, page = 1, limit = 10 } = {}) => {
    const params = { limit };
    if (context) params.context = context;
    if (page > 1) params.page = page;
    const response = await api.get('/platform-ratings/public', { params });
    return response.data;
  },
};
