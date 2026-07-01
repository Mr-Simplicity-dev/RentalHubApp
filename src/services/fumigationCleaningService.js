import api from './api';

export const fumigationCleaningService = {
  // Service categories
  getServiceCategories: async () => {
    const response = await api.get('/fumigation-cleaning/categories');
    return response.data;
  },

  getAllServices: async () => {
    const response = await api.get('/fumigation-cleaning/services');
    return response.data;
  },

  getServiceDetails: async (serviceId) => {
    const response = await api.get(`/fumigation-cleaning/services/${serviceId}`);
    return response.data;
  },

  calculateServicePrice: async ({ serviceId, selectedAddons = [] }) => {
    const response = await api.post('/fumigation-cleaning/calculate-price', {
      serviceId,
      selectedAddons,
    });
    return response.data;
  },

  // Booking eligibility
  checkBookingEligibility: async (propertyId) => {
    const response = await api.get(`/fumigation-cleaning/eligibility/${propertyId}`);
    return response.data;
  },

  // Bookings
  createBooking: async (bookingData) => {
    const response = await api.post('/fumigation-cleaning/bookings', bookingData);
    return response.data;
  },

  getMyBookings: async (params) => {
    const response = await api.get('/fumigation-cleaning/bookings', { params });
    return response.data;
  },

  getBookingDetails: async (bookingId) => {
    const response = await api.get(`/fumigation-cleaning/bookings/${bookingId}`);
    return response.data;
  },

  cancelBooking: async (bookingId, cancellationReason = '') => {
    const response = await api.delete(`/fumigation-cleaning/bookings/${bookingId}/cancel`, {
      data: { cancellation_reason: cancellationReason },
    });
    return response.data;
  },

  // Payment
  initializeBookingPayment: async (bookingId, paymentMethod = 'paystack') => {
    const response = await api.post(`/fumigation-cleaning/bookings/${bookingId}/pay`, {
      payment_method: paymentMethod,
    });
    return response.data;
  },

  verifyPayment: async (reference) => {
    const response = await api.get(`/fumigation-cleaning/verify-payment/${reference}`);
    return response.data;
  },

  // Dashboard stats
  getTenantStats: async () => {
    const response = await api.get('/fumigation-cleaning/stats');
    return response.data;
  },

  getUpcomingBookings: async () => {
    const response = await api.get('/fumigation-cleaning/upcoming');
    return response.data;
  },

  // Reviews
  getServiceReviews: async (serviceId) => {
    const response = await api.get(`/fumigation-cleaning/services/${serviceId}/reviews`);
    return response.data;
  },

  // Admin endpoints
  getAllBookings: async (params) => {
    const response = await api.get('/fumigation-cleaning/admin/bookings', { params });
    return response.data;
  },

  getAdminStats: async () => {
    const response = await api.get('/fumigation-cleaning/admin/stats');
    return response.data;
  },

  getProviders: async () => {
    const response = await api.get('/fumigation-cleaning/admin/providers');
    return response.data;
  },

  updateBookingStatus: async (bookingId, status, updateData = {}) => {
    const response = await api.put(`/fumigation-cleaning/admin/bookings/${bookingId}/status`, {
      status,
      ...updateData,
    });
    return response.data;
  },

  assignProvider: async (bookingId, providerId) => {
    const response = await api.post(`/fumigation-cleaning/admin/bookings/${bookingId}/assign-provider`, {
      provider_id: providerId,
    });
    return response.data;
  },

  getAvailableProvidersForBooking: async (bookingId) => {
    const response = await api.get(`/fumigation-cleaning/admin/bookings/${bookingId}/available-providers`);
    return response.data;
  },

  // Safety compliance
  submitSafetyCompliance: async (bookingId, complianceData) => {
    const response = await api.post(`/fumigation-cleaning/admin/compliance/${bookingId}`, complianceData);
    return response.data;
  },

  getComplianceRecord: async (bookingId) => {
    const response = await api.get(`/fumigation-cleaning/compliance/${bookingId}`);
    return response.data;
  },
};
