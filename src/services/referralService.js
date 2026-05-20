import api from './api';

export const referralService = {
  getMyReferral: async () => {
    const response = await api.get('/referrals/me');
    return response.data;
  },
};
