import api from './api';

export const propertyService = {
  // Location and state endpoints
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

  // Public property endpoints
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

  // Property unlock endpoints
  unlockProperty: async (propertyId, paymentData) => {
    const response = await api.post(`/properties/${propertyId}/unlock`, paymentData);
    return response.data;
  },

  getUnlockedProperties: async (params) => {
    const response = await api.get('/properties/user/unlocked', { params });
    return response.data;
  },

  checkPropertyUnlockStatus: async (propertyId) => {
    const response = await api.get(`/properties/${propertyId}/unlock-status`);
    return response.data;
  },

  // Favorite/save endpoints
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

  // Landlord property management
  createProperty: async (propertyData) => {
    const formData = new FormData();
    
    // Add all property data
    Object.keys(propertyData).forEach(key => {
      if (key === 'images' && Array.isArray(propertyData[key])) {
        propertyData[key].forEach((image, index) => {
          formData.append('images', {
            uri: image.uri || image,
            type: image.type || 'image/jpeg',
            name: image.fileName || `photo_${index}.jpg`,
          });
        });
      } else if (key === 'video' && propertyData[key]) {
        formData.append('video', {
          uri: propertyData[key].uri || propertyData[key],
          type: propertyData[key].type || 'video/mp4',
          name: propertyData[key].fileName || 'video.mp4',
        });
      } else if (key === 'amenities' && Array.isArray(propertyData[key])) {
        formData.append(key, JSON.stringify(propertyData[key]));
      } else if (propertyData[key] !== undefined && propertyData[key] !== null) {
        formData.append(key, propertyData[key]);
      }
    });

    const response = await api.post('/properties', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

  // Review endpoints
  addReview: async (propertyId, reviewData) => {
    const response = await api.post(`/properties/${propertyId}/review`, reviewData);
    return response.data;
  },

  getPropertyReviews: async (propertyId, params) => {
    const response = await api.get(`/properties/${propertyId}/reviews`, { params });
    return response.data;
  },

  // Property statistics
  getPropertyStats: async (propertyId) => {
    const response = await api.get(`/properties/${propertyId}/stats`);
    return response.data;
  },

  // Property utility endpoints
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

  // Property alerts
  requestPropertyAlert: async (requestData) => {
    const response = await api.post('/property-alerts/request', requestData);
    return response.data;
  },

  completePropertyAlertRequest: async (reference) => {
    const response = await api.post(`/property-alerts/request/complete/${reference}`);
    return response.data;
  },

  // Damage report endpoints
  saveDamageReport: async (propertyId, damageData) => {
    const formData = new FormData();
    
    // Add damage data
    Object.keys(damageData).forEach(key => {
      if (key === 'photos' && Array.isArray(damageData[key])) {
        damageData[key].forEach((photo, index) => {
          formData.append('photos', {
            uri: photo.uri || photo,
            type: photo.type || 'image/jpeg',
            name: photo.fileName || `damage_photo_${index}.jpg`,
          });
        });
      } else if (damageData[key] !== undefined && damageData[key] !== null) {
        formData.append(key, damageData[key]);
      }
    });

    const response = await api.post(`/properties/${propertyId}/damage-report`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getDamageReports: async (propertyId) => {
    const response = await api.get(`/properties/${propertyId}/damage-reports`);
    return response.data;
  },

  getLatestPublishedDamageReport: async (propertyId) => {
    const response = await api.get(`/properties/${propertyId}/damage-report/latest-published`);
    return response.data;
  },

  // Property users for disputes
  getPropertyUsers: async (propertyId) => {
    const response = await api.get(`/properties/${propertyId}/users`);
    return response.data;
  },

  // Bank account verification
  verifyBankAccount: async (bankData) => {
    const response = await api.post('/properties/verify-bank-account', bankData);
    return response.data;
  },
};
