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
};
