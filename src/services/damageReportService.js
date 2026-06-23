import api from './api';

export const damageReportService = {
  createDamageReport: async (propertyId, damageData) => {
    const formData = new FormData();

    Object.keys(damageData).forEach((key) => {
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

  getDamageReports: async (propertyId, params) => {
    const response = await api.get(`/properties/${propertyId}/damage-reports`, { params });
    return response.data;
  },

  getDamageReportDetails: async (reportId) => {
    const response = await api.get(`/damage-reports/${reportId}`);
    return response.data;
  },

  getLatestPublishedDamageReport: async (propertyId) => {
    const response = await api.get(`/properties/${propertyId}/damage-report/latest-published`);
    return response.data;
  },

  updateDamageReport: async (reportId, updateData) => {
    const response = await api.put(`/damage-reports/${reportId}`, updateData);
    return response.data;
  },

  deleteDamageReport: async (reportId) => {
    const response = await api.delete(`/damage-reports/${reportId}`);
    return response.data;
  },

  // Damage report visibility
  updateVisibility: async (reportId, visibilityData) => {
    const response = await api.patch(`/damage-reports/${reportId}/visibility`, visibilityData);
    return response.data;
  },

  getVisibilitySettings: async (reportId) => {
    const response = await api.get(`/damage-reports/${reportId}/visibility`);
    return response.data;
  },

  // Admin endpoints
  getAllDamageReports: async (params) => {
    const response = await api.get('/damage-reports/admin/all', { params });
    return response.data;
  },

  // Get current user's damage reports (landlord/tenant/admin)
  getMyDamageReports: async (params = {}) => {
    const response = await api.get('/damage-reports/my', { params });
    return response.data;
  },

  moderateDamageReport: async (reportId, moderationData) => {
    const response = await api.patch(`/damage-reports/${reportId}/moderate`, moderationData);
    return response.data;
  },
};
