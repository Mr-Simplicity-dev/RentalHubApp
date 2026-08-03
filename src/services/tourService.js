import api from './api';

export const tourService = {
  getState: async ({ dashboardType, tourKey } = {}) => {
    const response = await api.get('/users/tour', {
      params: {
        dashboard_type: dashboardType,
        platform: 'mobile',
        tour_key: tourKey || dashboardType,
      },
    });
    return response.data;
  },

  recordEvent: async (payload) => {
    const response = await api.post('/users/tour/events', payload);
    return response.data;
  },
};
