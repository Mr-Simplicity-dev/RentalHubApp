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
    const res = await api.get('/fumigation/team/assigned');
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
    const res = await api.post(`/fumigation/team/jobs/${bookingId}/status`, { ...payload, status: payload.status ?? payload.newStatus, chemical_used: payload.chemical_used ?? payload.chemicalName, ventilation_hours: payload.ventilation_hours ?? payload.ventilationHours, after_photos: payload.after_photos ?? payload.afterPhotos });
    return res.data?.data || res.data;
  },

  /**
   * Team: Broadcast high-accuracy GPS coordinates ping
   */
  async sendLocationPing({ bookingId, latitude, longitude, accuracy, heading, speed, altitude, batteryLevel }) {
    const res = await api.post(`/fumigation/team/jobs/${bookingId}/ping`, {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      altitude,
      battery_level: batteryLevel
    });
    return res.data?.data || res.data;
  },

  /**
   * Team: Submit formal service report & NAFDAC chemical verification
   */
  async submitServiceReport(payload) {
    const res = await api.post(`/fumigation/team/jobs/${payload.bookingId ?? payload.booking_id}/report`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Team: Report operational incident, weather delay or chemical alert
   */
  async reportIncident(payload) {
    const res = await api.post(`/fumigation/team/jobs/${payload.bookingId ?? payload.booking_id}/incidents`, payload);
    return res.data?.data || res.data;
  }
};

export default fumigationTrackingService;
