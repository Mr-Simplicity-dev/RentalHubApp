import api, { API_BASE_URL } from './api';

const resolveApiOrigin = () => {
  const base = String(API_BASE_URL || '').trim();
  if (!base) return 'https://rentalhub.com.ng';
  return base.replace(/\/api\/?$/i, '');
};

export const resolveStaffPhotoUrl = (photoUrl) => {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${resolveApiOrigin()}${trimmed}`;
  }
  return null;
};

export const staffVerificationService = {
  lookupPublicStaff: (identifier) =>
    api.get(`/staff-verification/public/lookup/${encodeURIComponent(String(identifier || '').trim())}`),

  createLiveChallenge: ({ staff_verification_id, purpose }) =>
    api.post('/staff-verification/public/challenges', {
      staff_verification_id,
      purpose,
      channel: 'mobile',
    }),

  pollLiveChallenge: (challengeReference, pollToken) =>
    api.get(`/staff-verification/public/challenges/${encodeURIComponent(challengeReference)}`, {
      params: { poll_token: pollToken },
    }),

  submitImpersonationReport: (payload) =>
    api.post('/staff-verification/public/impersonation-reports', {
      ...payload,
      channel: 'mobile',
    }),

  getMyStaffIdentity: () => api.get('/staff-verification/me'),

  getAdminCatalog: () => api.get('/staff-verification/admin/catalog'),
  getEligibleUsers: (search = '') => api.get('/staff-verification/admin/eligible-users', { params: { search, limit: 100 } }),
  listIdentities: (params = {}) => api.get('/staff-verification/admin/identities', { params }),
  createIdentity: payload => api.post('/staff-verification/admin/identities', payload),
  updateIdentity: (id, payload) => api.patch(`/staff-verification/admin/identities/${encodeURIComponent(id)}`, payload),
  updateIdentityStatus: (id, action, reason) => api.post(`/staff-verification/admin/identities/${encodeURIComponent(id)}/status`, { action, reason }),
  regenerateIdentityId: id => api.post(`/staff-verification/admin/identities/${encodeURIComponent(id)}/regenerate-id`),
  uploadIdentityPhoto: (id, asset) => {
    const body = new FormData();
    body.append('photo', { uri: asset.uri, name: asset.name, type: asset.mimeType });
    return api.post(`/staff-verification/admin/identities/${encodeURIComponent(id)}/photo`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getAdminHistory: () => api.get('/staff-verification/admin/history', { params: { limit: 100 } }),
  listImpersonationReports: () => api.get('/staff-verification/admin/impersonation-reports', { params: { limit: 100 } }),
  updateImpersonationReport: (id, payload) => api.patch(`/staff-verification/admin/impersonation-reports/${encodeURIComponent(id)}`, payload),

  getMyPendingChallenges: () => api.get('/staff-verification/me/challenges/pending'),

  lookupMyChallenge: (codeOrQr) =>
    api.post('/staff-verification/me/challenges/lookup', { code_or_qr: codeOrQr }),

  respondToChallenge: (challengeReference, decision, note = '') =>
    api.post(`/staff-verification/me/challenges/${encodeURIComponent(challengeReference)}/respond`, {
      decision,
      note,
    }),
};

export default staffVerificationService;
