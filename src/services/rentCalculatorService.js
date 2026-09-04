import api from './api';

export const rentCalculatorService = {
  getFees: async (params = {}) => {
    const response = await api.get('/rent-calculator/fees', { params });
    return response.data;
  },

  estimate: async (payload) => {
    const response = await api.post('/rent-calculator/estimate', payload);
    return response.data;
  },

  adminGetFees: async () => {
    const response = await api.get('/rent-calculator/admin/fees');
    return response.data;
  },

  adminUpsertFee: async (payload) => {
    const response = await api.post('/rent-calculator/admin/fees', payload);
    return response.data;
  },

  adminDeleteFee: async (feeId, reason) => {
    const response = await api.delete(`/rent-calculator/admin/fees/${feeId}`, {
      data: { reason },
    });
    return response.data;
  },
};
