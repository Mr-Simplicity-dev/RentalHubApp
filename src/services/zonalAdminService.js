import api from './api';

export const zonalAdminService = {
  getDashboard: async () => {
    const response = await api.get('/zonal-admin/dashboard');
    return response.data;
  },
};
