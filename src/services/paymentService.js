import api from './api';

export const paymentService = {
  getSubscriptionPlans: async () => {
    const response = await api.get('/payments/subscription-plans');
    return response.data;
  },

  getListingPlans: async () => {
    const response = await api.get('/payments/listing-plans');
    return response.data;
  },

  initializeSubscription: async (planId, paymentMethod = 'paystack') => {
    const response = await api.post('/payments/subscribe', {
      plan_id: planId,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  verifySubscription: async (reference) => {
    const response = await api.get(`/payments/verify-subscription/${reference}`);
    return response.data;
  },

  getSubscriptionStatus: async () => {
    const response = await api.get('/payments/subscription-status');
    return response.data;
  },

  initializeListingPayment: async (planId, propertyId, paymentMethod = 'paystack') => {
    const response = await api.post('/payments/pay-listing', {
      plan_id: planId,
      property_id: propertyId,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  verifyListingPayment: async (reference) => {
    const response = await api.get(`/payments/verify-listing/${reference}`);
    return response.data;
  },

  initializeRentPayment: async (propertyId, amount, paymentMethod = 'paystack') => {
    const response = await api.post('/payments/pay-rent', {
      property_id: propertyId,
      amount,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  verifyRentPayment: async (reference) => {
    const response = await api.get(`/payments/verify-rent/${reference}`);
    return response.data;
  },

  getPaymentHistory: async (params = {}) => {
    const response = await api.get('/payments/history', { params });
    return response.data;
  },

  getPaymentDetails: async (paymentId) => {
    const response = await api.get(`/payments/${paymentId}`);
    return response.data;
  },

  initializePropertyUnlock: async (propertyId, paymentMethod = 'paystack') => {
    const response = await api.post('/payments/unlock-property', {
      property_id: propertyId,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  verifyPropertyUnlock: async (reference) => {
    const response = await api.get(`/payments/verify-unlock/${reference}`);
    return response.data;
  },

  getPropertyUnlockStatus: async (propertyId) => {
    const response = await api.get(`/payments/unlock-status/${propertyId}`);
    return response.data;
  },

  getMyUnlockedProperties: async () => {
    const response = await api.get('/payments/my-unlocked-properties');
    return response.data;
  },

  getLocationAccessQuote: async (params = {}) => {
    const response = await api.get('/payments/location-access/quote', { params });
    return response.data;
  },

  initializeLocationAccess: async ({ state_id, lga_name, payment_method = 'paystack' }) => {
    const response = await api.post('/payments/location-access', {
      state_id,
      lga_name,
      payment_method,
    });
    return response.data;
  },

  verifyLocationAccess: async (reference) => {
    const response = await api.get(`/payments/location-access/verify/${reference}`);
    return response.data;
  },

  getSubscriptionQuote: async (params = {}) => {
    const response = await api.get('/payments/subscription-quote', { params });
    return response.data;
  },

  retryPayment: async (paymentId) => {
    const response = await api.post(`/payments/retry/${paymentId}`);
    return response.data;
  },

  getBanks: async () => {
    const response = await api.get('/payments/banks');
    return response.data;
  },

  verifyBankAccount: async ({ bank_name, account_number }) => {
    const response = await api.post('/payments/verify-account', {
      bank_name,
      account_number,
    });
    return response.data;
  },

  getWalletBalance: async () => {
    const response = await api.get('/payments/wallet/balance');
    return response.data;
  },

  getLandlordWalletBalance: async () => {
    const response = await api.get('/payments/wallet/landlord-balance');
    return response.data;
  },

  getWalletWithdrawals: async () => {
    const response = await api.get('/payments/wallet/withdrawals');
    return response.data;
  },

  fundWallet: async (amount) => {
    const response = await api.post('/payments/wallet/fund', { amount });
    return response.data;
  },

  verifyWalletFund: async (reference) => {
    const response = await api.get(`/payments/wallet/fund/verify/${reference}`);
    return response.data;
  },

  withdrawFromWallet: async (withdrawData) => {
    const response = await api.post('/payments/wallet/withdraw', withdrawData);
    return response.data;
  },

  getLandlordPropertyFeeStatus: async () => {
    const response = await api.get('/payments/landlord-property-fee/status');
    return response.data;
  },

  skipLandlordPropertyFee: async () => {
    const response = await api.post('/payments/landlord-property-fee/skip');
    return response.data;
  },

  agreeLandlordPropertyFee: async () => {
    const response = await api.post('/payments/landlord-property-fee/agree');
    return response.data;
  },

  getEligibleGracePayments: async () => {
    const response = await api.get('/payments/tenancy-adjustments/grace/eligible');
    return response.data;
  },

  getMyGraceRequests: async () => {
    const response = await api.get('/payments/tenancy-adjustments/grace/my-requests');
    return response.data;
  },

  requestGracePeriod: async (payload) => {
    const response = await api.post('/payments/tenancy-adjustments/grace/request', payload);
    return response.data;
  },

  getLandlordGraceRequests: async (status = 'pending') => {
    const response = await api.get('/payments/tenancy-adjustments/grace/landlord', {
      params: { status },
    });
    return response.data;
  },

  respondToGraceRequest: async (requestId, payload) => {
    const response = await api.put(
      `/payments/tenancy-adjustments/grace/${requestId}/respond`,
      payload
    );
    return response.data;
  },
};
