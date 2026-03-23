import api from './api';

export const propertyService = {
  getStates: async () => {
    const response = await api.get('/properties/states');
    return response.data;
  },

  getLocationOptions: async () => {
    const response = await api.get('/property-utils/location-options');
    return response.data;
  },

  getPropertyAlertConfig: async (params = {}) => {
    const response = await api.get('/property-alerts/config', { params });
    return response.data;
  },

  browseProperties: async (page = 1, limit = 20) => {
    const response = await api.get('/properties/browse', {
      params: { page, limit },
    });
    return response.data;
  },

  searchProperties: async (filters) => {
    const response = await api.get('/properties/search', { params: filters });
    return response.data;
  },

  getFeaturedProperties: async (limit = 10) => {
    const response = await api.get('/properties/featured', { params: { limit } });
    return response.data;
  },

  getPropertyById: async (id) => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },

  getFullPropertyDetails: async (id) => {
    const response = await api.get(`/properties/${id}/details`);
    return response.data;
  },

  saveProperty: async (id) => {
    const response = await api.post(`/properties/${id}/save`);
    return response.data;
  },

  unsaveProperty: async (id) => {
    const response = await api.delete(`/properties/${id}/save`);
    return response.data;
  },

  getSavedProperties: async (params) => {
    const response = await api.get('/properties/user/saved', { params });
    return response.data;
  },

  createProperty: async (propertyData) => {
    const response = await api.post('/properties', propertyData);
    return response.data;
  },

  updateProperty: async (id, propertyData) => {
    const response = await api.put(`/properties/${id}`, propertyData);
    return response.data;
  },

  deleteProperty: async (id) => {
    const response = await api.delete(`/properties/${id}`);
    return response.data;
  },

  uploadPhotos: async (propertyId, images) => {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('photos', {
        uri: image.uri || image,
        type: image.type || 'image/jpeg',
        name: image.fileName || `photo_${index}.jpg`,
      });
    });

    const response = await api.post(`/properties/${propertyId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deletePhoto: async (propertyId, photoId) => {
    const response = await api.delete(`/properties/${propertyId}/photos/${photoId}`);
    return response.data;
  },

  getMyProperties: async (params) => {
    const response = await api.get('/properties/landlord/my-properties', { params });
    return response.data;
  },

  toggleAvailability: async (id) => {
    const response = await api.patch(`/properties/${id}/availability`);
    return response.data;
  },

  unlistProperty: async (id) => {
    const response = await api.patch(`/properties/${id}/unlist`);
    return response.data;
  },

  addReview: async (propertyId, reviewData) => {
    const response = await api.post(`/properties/${propertyId}/review`, reviewData);
    return response.data;
  },

  getPropertyReviews: async (propertyId, params) => {
    const response = await api.get(`/properties/${propertyId}/reviews`, { params });
    return response.data;
  },

  getPropertyStats: async (propertyId) => {
    const response = await api.get(`/properties/${propertyId}/stats`);
    return response.data;
  },

  getPopularLocations: async (limit = 10) => {
    const response = await api.get('/property-utils/popular-locations', {
      params: { limit },
    });
    return response.data;
  },

  getSimilarProperties: async (propertyId, limit = 5) => {
    const response = await api.get(`/property-utils/similar/${propertyId}`, {
      params: { limit },
    });
    return response.data;
  },

  getRecommendations: async (limit = 10) => {
    const response = await api.get('/property-utils/recommendations', {
      params: { limit },
    });
    return response.data;
  },

  requestPropertyAlert: async (requestData) => {
    const response = await api.post('/property-alerts/request', requestData);
    return response.data;
  },

  completePropertyAlertRequest: async (reference) => {
    const response = await api.post(`/property-alerts/request/complete/${reference}`);
    return response.data;
  },
};
