import api from './api';

export const transportationService = {
  getAllServices: async () => {
    const response = await api.get('/transportation/services');
    return response.data;
  },

  calculatePrice: async ({ serviceId, distanceKm }) => {
    const response = await api.post('/transportation/calculate-price', {
      serviceId,
      distanceKm,
    });
    return response.data;
  },

  checkBookingEligibility: async (propertyId) => {
    const response = await api.get(`/transportation/eligibility/${propertyId}`);
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await api.post('/transportation/bookings', bookingData);
    return response.data;
  },

  getMyBookings: async (params) => {
    const response = await api.get('/transportation/bookings', { params });
    return response.data;
  },

  getBookingDetails: async (bookingId) => {
    const response = await api.get(`/transportation/bookings/${bookingId}`);
    return response.data;
  },

  cancelBooking: async (bookingId, cancellationReason = '') => {
    const response = await api.delete(
      `/transportation/bookings/${bookingId}/cancel`,
      { data: { cancellation_reason: cancellationReason } }
    );
    return response.data;
  },

  initializeBookingPayment: async (bookingId, paymentMethod = 'paystack') => {
    const response = await api.post(`/transportation/bookings/${bookingId}/pay`, {
      payment_method: paymentMethod,
    });
    return response.data;
  },

  verifyPayment: async (reference) => {
    const response = await api.get(`/transportation/verify-payment/${reference}`);
    return response.data;
  },

  getTenantStats: async () => {
    const response = await api.get('/transportation/stats');
    return response.data;
  },

  getUpcomingBookings: async () => {
    const response = await api.get('/transportation/upcoming');
    return response.data;
  },
};
