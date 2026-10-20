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
  emailSubscribers: async () => {
    const response = await api.get('/email-marketing/subscribers', { params: { limit: 200 } });
    return response.data;
  },
  emailAddSubscriber: async ({ email, full_name }) => {
    const response = await api.post('/email-marketing/subscribers', { email, full_name });
    return response.data;
  },
  emailDeleteSubscriber: async (id) => {
    const response = await api.delete(`/email-marketing/subscribers/${id}`);
    return response.data;
  },
  emailCreateTemplate: async ({ name, subject, htmlContent }) => {
    const response = await api.post('/email-marketing/templates', { name, subject, htmlContent });
    return response.data;
  },
  emailCreateCampaign: async ({ name, subject, content_html }) => {
    const response = await api.post('/email-marketing/campaigns', { name, subject, content_html });
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
  smsSubscribers: async () => {
    const response = await api.get('/sms-marketing/subscribers', { params: { limit: 200 } });
    return response.data;
  },
  smsAddSubscriber: async ({ phone, full_name }) => {
    const response = await api.post('/sms-marketing/subscribers', { phone, full_name });
    return response.data;
  },
  smsDeleteSubscriber: async (id) => {
    const response = await api.delete(`/sms-marketing/subscribers/${id}`);
    return response.data;
  },
  smsCreateTemplate: async ({ name, content }) => {
    const response = await api.post('/sms-marketing/templates', { name, content });
    return response.data;
  },
  smsCreateCampaign: async ({ name, template_id }) => {
    const response = await api.post('/sms-marketing/campaigns', { name, template_id });
    return response.data;
  },

  // WhatsApp
  whatsappStats: async () => {
    const response = await api.get('/whatsapp-marketing/stats');
    return response.data;
  },
  whatsappAudience: async ({ scope = 'all', user_type = '', source = 'users' } = {}) => {
    const params = { scope, source };
    if (scope === 'user_type' && user_type) params.user_type = user_type;
    const response = await api.get('/whatsapp-marketing/audience', { params });
    return response.data;
  },
  whatsappCampaigns: async () => {
    const response = await api.get('/whatsapp-marketing/campaigns');
    return response.data;
  },
  whatsappCreateCampaign: async (payload) => {
    const response = await api.post('/whatsapp-marketing/campaigns', payload);
    return response.data;
  },
  whatsappSendCampaign: async (campaignId, note) => {
    const response = await api.post(`/whatsapp-marketing/campaigns/${campaignId}/send`, { note });
    return response.data;
  },
  whatsappRetryCampaign: async (campaignId, note) => {
    const response = await api.post(`/whatsapp-marketing/campaigns/${campaignId}/retry`, { note });
    return response.data;
  },
  whatsappDeleteCampaign: async (campaignId, note) => {
    const response = await api.delete(`/whatsapp-marketing/campaigns/${campaignId}`, { data: { note } });
    return response.data;
  },
  whatsappCampaignStats: async (campaignId) => {
    const response = await api.get(`/whatsapp-marketing/campaigns/${campaignId}/stats`);
    return response.data;
  },
  whatsappUploadMedia: async (formData) => {
    const response = await api.post('/whatsapp-marketing/media', formData);
    return response.data;
  },
  whatsappContacts: async () => {
    const response = await api.get('/whatsapp-marketing/contacts');
    return response.data;
  },
  whatsappImportContacts: async (phones) => {
    const response = await api.post('/whatsapp-marketing/contacts/import', { phones });
    return response.data;
  },
  whatsappCheckContacts: async (payload = { all: true }) => {
    const response = await api.post('/whatsapp-marketing/contacts/check', payload);
    return response.data;
  },
  whatsappDeleteContact: async (id) => {
    const response = await api.delete(`/whatsapp-marketing/contacts/${id}`);
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
