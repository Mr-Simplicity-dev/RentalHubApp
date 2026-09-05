import api from './api';

export const zonalAdminService = {
  getDashboard: async () => {
    const response = await api.get('/zonal-admin/dashboard');
    return response.data;
  },

  listResource: async (resource) => {
    const response = await api.get(`/zonal-admin/${resource}`, { params: { limit: 100 } });
    return response.data;
  },
};
