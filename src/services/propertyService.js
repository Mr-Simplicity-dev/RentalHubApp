import api from './api';

export const propertyService = {
  // Get all states
  getStates: async () => {
    const response = await api.get('/properties/states');
    return response.data;
  },

  // Browse properties
  browseProperties: async (page = 1, limit = 20) => {
    const response = await api.get('/properties/browse', {
      params: { page, limit },
    });
    return response.data;
  },

  // Search properties
  searchProperties: async (filters) => {
    const response = await api.get('/properties/search', { params: filters });
    return response.data;
  },

  // Get property by ID
  getPropertyById: async (id) => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },

  // Get full property details
  getFullPropertyDetails: async (id) => {
    const response = await api.get(`/properties/${id}/details`);
    return response.data;
  },

  // Save property
  saveProperty: async (id) => {
    const response = await api.post(`/properties/${id}/save`);
    return response.data;
  },

  // Unsave property
  unsaveProperty: async (id) => {
    const response = await api.delete(`/properties/${id}/save`);
    return response.data;
  },

  // Get saved properties
  getSavedProperties: async (params) => {
    const response = await api.get('/properties/user/saved', { params });
    return response.data;
  },

  // Create property (landlord)
  createProperty: async (propertyData) => {
    const response = await api.post('/properties', propertyData);
    return response.data;
  },

  // Upload property photos
  uploadPhotos: async (propertyId, images) => {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('photos', {
        uri: image.uri,
        type: 'image/jpeg',
        name: `photo_${index}.jpg`,
      });
    });

    const response = await api.post(`/properties/${propertyId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};