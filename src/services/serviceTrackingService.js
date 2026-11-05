import api from './api';

/**
 * ServiceTrackingService (Mobile React Native)
 * Provides unified tracking for Transportation and Fumigation services
 */
const serviceTrackingService = {
  /**
   * Fetch tenant active and historic services
   * @param {'all' | 'transportation' | 'fumigation'} filter
   */
  async getMyServices(filter = 'all') {
    const res = await api.get(`/service-tracking/my-services?filter=${encodeURIComponent(filter)}`);
    return res.data?.data || [];
  },

  /**
   * Fetch specific service details with tracking context
   * @param {'transportation' | 'fumigation'} serviceType
   * @param {string | number} bookingId
   */
  async getServiceDetails(serviceType, bookingId) {
    const res = await api.get(`/service-tracking/${serviceType}/${bookingId}`);
    return res.data?.data || null;
  }
};

export default serviceTrackingService;
