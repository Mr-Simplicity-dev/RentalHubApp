import api from './api';

export const voiceMonitorService = {
  summary: async () => {
    const response = await api.get('/voice/summary');
    return response.data;
  },
  deskScope: async () => {
    const response = await api.get('/voice/desk-scope');
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
  dutyStatus: async () => {
    const response = await api.get('/voice/duty-status');
    return response.data;
  },
  callContext: async (callSid) => {
    const response = await api.get('/voice/call-context', {
      params: { callSid },
    });
    return response.data;
  },
  myCallRoomHistory: async () => {
    const response = await api.get('/voice/my-call-room-history');
    return response.data;
  },
  escalate: async ({ callSid, action, department, note }) => {
    const response = await api.post('/voice/escalate', {
      callSid,
      action,
      department,
      note,
    });
    return response.data;
  },
};
