import api from './api';

const bankTransferService = {
  getAccounts: async (params = {}) => {
    const response = await api.get('/bank-transfer/accounts', { params });
    return response.data;
  },
  submitRegistrationProof: async (payload) => {
    const response = await api.post('/bank-transfer/registration/proof', payload);
    return response.data;
  },
  submitWalletProof: async (payload) => {
    const response = await api.post('/bank-transfer/wallet/proof', payload);
    return response.data;
  },
  getRegistrationStatus: async (reference) => {
    const response = await api.get(`/bank-transfer/registration/status/${reference}`);
    return response.data;
  },
  getWalletAccount: async () => {
    const response = await api.get('/virtual-accounts/wallet');
    return response.data;
  },
  getWalletCredits: async () => {
    const response = await api.get('/virtual-accounts/wallet/credits');
    return response.data;
  },
};

export default bankTransferService;
