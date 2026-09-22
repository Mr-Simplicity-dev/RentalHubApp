import api from './api';

// Rent help: a tenant asks someone else to pay their rent, and the payer opens
// the one-time link. Mirrors the web flows (PayRentOnBehalf / RequestRentHelp).
export const rentHelpService = {
  getEligibleProperties: async () => {
    const response = await api.get('/payments/rent-help/eligible');
    return response.data;
  },

  createRequest: async (propertyId) => {
    const response = await api.post('/payments/request-rent-payment', {
      property_id: Number(propertyId),
    });
    return response.data;
  },

  getRentRequest: async (token) => {
    const response = await api.get(`/payments/rent-request/${token}`);
    return response.data;
  },

  payOnBehalf: async (token, { paymentMethod = 'paystack', beneficiaryConfirm = true } = {}) => {
    const response = await api.post(`/payments/pay-rent-on-behalf/${token}`, {
      payment_method: paymentMethod,
      beneficiary_confirm: beneficiaryConfirm === true,
    });
    return response.data;
  },
};

export default rentHelpService;
