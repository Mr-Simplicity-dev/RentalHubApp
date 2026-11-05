import api from './api';

/**
 * TransportationTrackingService (Mobile React Native)
 * Customer tracking and Driver operations
 */
const transportationTrackingService = {
  /**
   * Customer: Fetch real-time relocation/transit tracking summary
   */
  async getTrackingSummary(bookingId) {
    const res = await api.get(`/transportation/bookings/${bookingId}/tracking`);
    return res.data?.data || null;
  },

  /**
   * Customer: Confirm safe delivery & receipt of cargo
   */
  async confirmSignoff(bookingId, payload) {
    const res = await api.post(`/transportation/bookings/${bookingId}/signoff`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Driver: Fetch assigned driver trips
   */
  async getDriverTrips() {
    const res = await api.get('/transportation/driver/trips');
    return res.data?.data || [];
  },

  /**
   * Driver: Update transit stage
   */
  async updateTripStatus(bookingId, payload) {
    const res = await api.patch(`/transportation/driver/trips/${bookingId}/status`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Driver: Send GPS location telemetry ping
   */
  async sendLocationPing({ bookingId, latitude, longitude, accuracy, heading, speed, altitude, batteryLevel }) {
    const res = await api.post('/transportation/driver/location-ping', {
      bookingId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      altitude,
      batteryLevel
    });
    return res.data?.data || res.data;
  },

  /**
   * Driver: Report road blockages, mechanical delay or accident
   */
  async reportIncident(payload) {
    const res = await api.post('/transportation/driver/incident', payload);
    return res.data?.data || res.data;
  }
};

export default transportationTrackingService;
