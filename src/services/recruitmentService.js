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
  getMyApplications: (email) => api.get('/recruitment/my-applications', { params: { email } }),
  startInterview: (payload) => api.post('/recruitment/interview/start', payload),
  submitInterviewAnswer: (payload) => api.post('/recruitment/interview/answer', payload),
  completeInterview: (payload) => api.post('/recruitment/interview/complete', payload),
  pingInterview: (payload) => api.post('/recruitment/interview/ping', payload),
  reportViolation: (payload) => api.post('/recruitment/interview/violation', payload),
};

export default recruitmentService;
