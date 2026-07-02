import api from './api';

export const recruitmentService = {
  getStatus: () => api.get('/recruitment/status'),
  getActiveCycles: () => api.get('/recruitment/cycles/active'),
  getActiveRoles: (cycleId) => api.get('/recruitment/roles/active', {
    params: cycleId ? { cycle_id: cycleId } : {},
  }),
  getStates: () => api.get('/recruitment/locations/states'),
  getLGAs: (stateName) => api.get(`/recruitment/locations/lgas/${encodeURIComponent(stateName)}`),
  createApplication: (payload) => api.post('/recruitment/apply', payload),
  getMyApplication: ({ email, referenceNumber }) => api.get('/recruitment/my-application', { params: { email, referenceNumber } }),
  getMyApplications: (email) => api.get('/recruitment/my-applications', { params: { email } }),
  initiatePayment: (payload) => api.post('/recruitment/payments/initiate', {
    amount: payload?.amount ?? 5000,
    ...payload,
  }),
  verifyPayment: (reference) => api.post(`/recruitment/payments/verify/${encodeURIComponent(reference)}`),
  verifyAccessCode: (payload) => api.post('/recruitment/verify-access-code', {
    ...payload,
    access_code: payload?.access_code || payload?.code || '',
    code: payload?.code || payload?.access_code || '',
  }),
  uploadDocuments: (applicationId, formData) => api.post(`/recruitment/documents/upload/${applicationId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  startInterview: (payload) => api.post('/recruitment/interview/start', payload),
  submitInterviewAnswer: (payload) => api.post('/recruitment/interview/answer', payload),
  completeInterview: (payload) => api.post('/recruitment/interview/complete', payload),
  pingInterview: (payload) => api.post('/recruitment/interview/ping', payload),
  reportViolation: (payload) => api.post('/recruitment/interview/violation', payload),
};

export default recruitmentService;
