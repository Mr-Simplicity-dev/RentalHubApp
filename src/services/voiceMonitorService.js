import api from './api';

export const voiceMonitorService = {
  summary: async () => {
    const response = await api.get('/voice/summary');
    return response.data;
  },
  callLog: async () => {
    const response = await api.get('/voice/call-log');
    return response.data;
  },
  callbacks: async () => {
    const response = await api.get('/voice/callbacks');
    return response.data;
  },
};
