import api from './api';

export const transportationService = {
  // Service categories
  getServiceCategories: async () => {
    const response = await api.get('/transportation/categories');
    return response.data;
  },

  getAllServices: async () => {
    const response = await api.get('/transportation/services');
    return response.data;
  },

  getServiceDetails: async (serviceId) => {
    const response = await api.get(`/transportation/services/${serviceId}`);
    return response.data;
  },

  calculatePrice: async ({ serviceId, distanceKm }) => {
    const response = await api.post('/transportation/calculate-price', {
      serviceId,
      distanceKm,
    });
    return response.data;
  },

  // Booking eligibility
  checkBookingEligibility: async (propertyId) => {
    const response = await api.get(`/transportation/eligibility/${propertyId}`);
    return response.data;
  },

  getAvailableBookingDates: async (params) => {
    const response = await api.get('/transportation/available-dates', { params });
    return response.data;
  },

  // Bookings
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
    const response = await api.delete(`/transportation/bookings/${bookingId}/cancel`, {
      data: { cancellation_reason: cancellationReason },
    });
    return response.data;
  },

  // Payment
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

  // Dashboard stats
  getTenantStats: async () => {
    const response = await api.get('/transportation/stats');
    return response.data;
  },

  getUpcomingBookings: async () => {
    const response = await api.get('/transportation/upcoming');
    return response.data;
  },

  // Reviews
  submitReview: async (bookingId, reviewData) => {
    const response = await api.post(`/transportation/bookings/${bookingId}/review`, reviewData);
    return response.data;
  },

  getServiceReviews: async (serviceId) => {
    const response = await api.get(`/transportation/services/${serviceId}/reviews`);
    return response.data;
  },

  // Admin endpoints
  getAllBookings: async (params) => {
    const response = await api.get('/transportation/admin/bookings', { params });
    return response.data;
  },

  getAdminStats: async () => {
    const response = await api.get('/transportation/admin/stats');
    return response.data;
  },

  getProviders: async () => {
    const response = await api.get('/transportation/admin/providers');
    return response.data;
  },

  updateBookingStatus: async (bookingId, status, updateData = {}) => {
    const response = await api.put(`/transportation/admin/bookings/${bookingId}/status`, {
      status,
      ...updateData,
    });
    return response.data;
  },

  assignProvider: async (bookingId, providerId) => {
    const response = await api.post(`/transportation/admin/bookings/${bookingId}/assign-provider`, {
      provider_id: providerId,
    });
    return response.data;
  },

  getAvailableProvidersForBooking: async (bookingId) => {
    const response = await api.get(`/transportation/admin/bookings/${bookingId}/available-providers`);
    return response.data;
  },
};
