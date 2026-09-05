import api from './api';

export const marketingOpsService = {
  // Email
  emailStats: async () => {
    const response = await api.get('/email-marketing/stats');
    return response.data;
  },
  emailCampaigns: async () => {
    const response = await api.get('/email-marketing/campaigns');
    return response.data;
  },
  sendEmailCampaign: async (campaignId) => {
    const response = await api.post(`/email-marketing/campaigns/${campaignId}/send`);
    return response.data;
  },

  // SMS
  smsStats: async () => {
    const response = await api.get('/sms-marketing/stats');
    return response.data;
  },
  smsCampaigns: async () => {
    const response = await api.get('/sms-marketing/campaigns');
    return response.data;
  },
  sendSmsCampaign: async (campaignId) => {
    const response = await api.post(`/sms-marketing/campaigns/${campaignId}/send`);
    return response.data;
  },
  retrySmsCampaign: async (campaignId) => {
    const response = await api.post(`/sms-marketing/campaigns/${campaignId}/retry`);
    return response.data;
  },

  // Diaspora desk
  diasporaOverview: async () => {
    const response = await api.get('/admin/diaspora/overview');
    return response.data;
  },
  dismissDiasporaFlag: async (userId, notes = '') => {
    const response = await api.post(`/admin/diaspora/users/${userId}/dismiss`, { notes });
    return response.data;
  },
};
