import api from './api';

export const tourService = {
  getState: async () => {
    const response = await api.get('/users/tour');
    return response.data;
  },

  recordEvent: async (payload) => {
    const response = await api.post('/users/tour/events', payload);
    return response.data;
  },
};
