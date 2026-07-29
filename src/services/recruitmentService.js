import api from './api';

export const recruitmentService = {
  getStatus: () => api.get('/recruitment/status'),
  getActiveCycles: () => api.get('/recruitment/cycles/active'),
  getActiveRoles: (cycleId) => api.get('/recruitment/roles/active', {
    params: cycleId ? { cycle_id: cycleId } : {},
  }),
  getAdminCycles: () => api.get('/recruitment/admin/cycles'),
  getAdminRoles: (params = {}) => api.get('/recruitment/admin/roles', { params }),
  getApplicants: (params = {}) => api.get('/recruitment/admin/applicants', { params }),
  getApplicantDetail: (applicationId) => api.get(`/recruitment/admin/applicants/${applicationId}`),
  getAnalytics: (params = {}) => api.get('/recruitment/admin/analytics', { params }),
  approveApplicant: (applicationId, payload = {}) => api.post(`/recruitment/admin/applicants/${applicationId}/approve`, payload),
  rejectApplicant: (applicationId, payload = {}) => api.post(`/recruitment/admin/applicants/${applicationId}/reject`, payload),
  shortlistApplicant: (applicationId, payload = {}) => api.post(`/recruitment/admin/applicants/${applicationId}/shortlist`, payload),
  bulkProcessApplicants: (payload = {}) => api.post('/recruitment/admin/applicants/bulk-process', payload),
  emailDocuments: (payload = {}) => api.post('/recruitment/admin/email-documents', payload),
  getStates: () => api.get('/recruitment/locations/states'),
  getLGAs: (stateName) => api.get(`/recruitment/locations/lgas/${encodeURIComponent(stateName)}`),
  createApplication: (payload) => api.post('/recruitment/apply', payload),
  getMyApplication: ({ email, referenceNumber }) => api.get('/recruitment/my-application', {
    params: { email, reference_number: referenceNumber },
  }),
  getMyApplications: ({ email, referenceNumber }) => api.get('/recruitment/my-applications', {
    params: { email, reference_number: referenceNumber },
  }),
  initiatePayment: (payload) => api.post('/recruitment/payments/initiate', {
    amount: payload?.amount ?? 5000,
    ...payload,
  }),
  verifyPayment: (reference, applicantAccess = {}) => api.post(
    `/recruitment/payments/verify/${encodeURIComponent(reference)}`,
    applicantAccess
  ),
  verifyAccessCode: (payload) => api.post('/recruitment/verify-access-code', {
    ...payload,
    access_code: payload?.access_code || payload?.code || '',
    code: payload?.code || payload?.access_code || '',
  }),
  uploadDocuments: (applicationId, formData, config = {}) => api.post(`/recruitment/documents/upload/${applicationId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  }),
  startInterview: (payload) => api.post('/recruitment/interview/start', payload),
  submitInterviewAnswer: (payload) => api.post('/recruitment/interview/answer', payload),
  completeInterview: (payload) => api.post('/recruitment/interview/complete', payload),
  pingInterview: (payload) => api.post('/recruitment/interview/ping', payload),
  reportViolation: (payload) => api.post('/recruitment/interview/violation', payload),
};

export default recruitmentService;
