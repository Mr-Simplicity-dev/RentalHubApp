import api from './api';

export const tenancyAgreementService = {
  list: async (params = {}) => {
    const response = await api.get('/tenancy-agreements', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/tenancy-agreements/${id}`);
    return response.data;
  },

  createFromApplication: async (applicationId) => {
    const response = await api.post('/tenancy-agreements', { application_id: applicationId });
    return response.data;
  },

  review: async (id, role) => {
    const response = await api.post(`/tenancy-agreements/${id}/review`, { role });
    return response.data;
  },

  sign: async (id, { role, consent, signatoryName }) => {
    const response = await api.post(`/tenancy-agreements/${id}/sign`, {
      role,
      consent,
      signatory_name: signatoryName,
    });
    return response.data;
  },

  decline: async (id, { role, reason }) => {
    const response = await api.post(`/tenancy-agreements/${id}/decline`, { role, reason });
    return response.data;
  },

  getAudit: async (id) => {
    const response = await api.get(`/tenancy-agreements/${id}/audit`);
    return response.data;
  },
};

export const TENANCY_AGREEMENT_STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_LANDLORD_REVIEW: 'Awaiting landlord review',
  PENDING_LANDLORD_SIGNATURE: 'Awaiting landlord signature',
  PENDING_TENANT_REVIEW: 'Awaiting tenant review',
  PENDING_TENANT_SIGNATURE: 'Awaiting tenant signature',
  PARTIALLY_EXECUTED: 'Partially executed',
  FULLY_EXECUTED: 'Fully executed',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  AMENDED: 'Amended',
  SUPERSEDED: 'Superseded',
};

export const tenancyAgreementStatusVisual = (status = 'DRAFT') => {
  if (status === 'FULLY_EXECUTED') return { color: '#169B62', bg: '#EAF9F2', icon: 'checkmark-circle' };
  if (status === 'DECLINED' || status === 'CANCELLED' || status === 'EXPIRED') return { color: '#D92D20', bg: '#FFF0EF', icon: 'close-circle' };
  if (String(status).startsWith('PENDING_TENANT')) return { color: '#1769E0', bg: '#EEF5FF', icon: 'person' };
  return { color: '#B46B00', bg: '#FFF6DD', icon: 'time' };
};

export default tenancyAgreementService;
