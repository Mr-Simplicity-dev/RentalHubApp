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
