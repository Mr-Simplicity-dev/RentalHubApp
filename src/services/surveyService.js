import api from './api';

export const surveyService = {
  myStatus: async () => {
    const response = await api.get('/survey/my-status');
    return response.data;
  },

  getDefinition: async ({ type, lang = 'en' }) => {
    const response = await api.get('/survey/definition', {
      params: { type, lang },
    });
    return response.data;
  },

  start: async () => {
    const response = await api.post('/survey/start');
    return response.data;
  },

  save: async ({ response_id, answers, consent_flags = {} }) => {
    const response = await api.post('/survey/save', {
      response_id,
      answers,
      consent_flags,
    });
    return response.data;
  },

  completePartA: async (responseId) => {
    const response = await api.post('/survey/complete-part-a', {
      response_id: responseId,
    });
    return response.data;
  },

  complete: async (responseId, timeSpentSeconds) => {
    const response = await api.post('/survey/complete', {
      response_id: responseId,
      time_spent_seconds: timeSpentSeconds,
    });
    return response.data;
  },

  marketingAgentOverview: async () => {
    const response = await api.get('/survey/marketing-agent/overview');
    return response.data;
  },

  publicFlags: async () => {
    const response = await api.get('/survey/public-flags');
    return response.data;
  },

  publicGate: async (turnstileToken) => {
    const response = await api.post('/survey/public/gate', { turnstile_token: turnstileToken });
    return response.data;
  },

  publicSubmit: async (payload) => {
    const response = await api.post('/survey/public/submit', payload);
    return response.data;
  },
};
