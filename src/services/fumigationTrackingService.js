import api from './api';

/**
 * FumigationTrackingService (Mobile React Native)
 * Customer tracking, specialist team operations, and safety protocols
 */
const fumigationTrackingService = {
  /**
   * Customer: Fetch real-time tracking summary & safety countdown
   */
  async getTrackingSummary(bookingId) {
    const res = await api.get(`/fumigation-cleaning/bookings/${bookingId}/tracking`);
    return res.data?.data || null;
  },

  /**
   * Customer: Confirm service signoff or report an issue
   */
  async confirmSignoff(bookingId, { satisfied = true, rating, feedback, problemReported, problemDescription }) {
    const res = await api.post(`/fumigation-cleaning/bookings/${bookingId}/signoff`, {
      satisfied,
      rating,
      feedback,
      problemReported: Boolean(problemReported),
      problemDescription
    });
    return res.data?.data || res.data;
  },

  /**
   * Team: Fetch jobs assigned to specialist squad
   */
  async getAssignedJobs() {
    const res = await api.get('/fumigation/team/jobs');
    return res.data?.data || [];
  },

  /**
   * Team: Fetch single job manifest
   */
  async getJobDetail(bookingId) {
    const res = await api.get(`/fumigation/team/jobs/${bookingId}`);
    return res.data?.data || null;
  },

  /**
   * Team: Progress status stage
   */
  async updateJobStatus(bookingId, payload) {
    const res = await api.patch(`/fumigation/team/jobs/${bookingId}/status`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Team: Broadcast high-accuracy GPS coordinates ping
   */
  async sendLocationPing({ bookingId, latitude, longitude, accuracy, heading, speed, altitude, batteryLevel }) {
    const res = await api.post('/fumigation/team/location-ping', {
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
   * Team: Submit formal service report & NAFDAC chemical verification
   */
  async submitServiceReport(payload) {
    const res = await api.post('/fumigation/team/service-report', payload);
    return res.data?.data || res.data;
  },

  /**
   * Team: Report operational incident, weather delay or chemical alert
   */
  async reportIncident(payload) {
    const res = await api.post('/fumigation/team/incident', payload);
    return res.data?.data || res.data;
  }
};

export default fumigationTrackingService;
