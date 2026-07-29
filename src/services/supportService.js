import api from './api';

const normalizeGuestProof = (proofOrEmail) => {
  if (typeof proofOrEmail === 'string') {
    return { email: proofOrEmail.trim() };
  }

  const proof = proofOrEmail && typeof proofOrEmail === 'object'
    ? proofOrEmail
    : {};
  return proof.guestAccessToken
    ? { guestAccessToken: String(proof.guestAccessToken).trim() }
    : { email: String(proof.email || '').trim() };
};

const guestRequestConfig = (guestAccessToken) => ({
  skipAuth: true,
  skipAuthRefresh: true,
  ...(guestAccessToken
    ? { headers: { 'X-Guest-Access-Token': guestAccessToken } }
    : {}),
});

export const supportService = {
  createTicket: async (ticketData) => {
    const response = await api.post('/support/tickets', ticketData);
    return response.data;
  },

  getMyTickets: async () => {
    const response = await api.get('/support/tickets/my');
    return response.data;
  },

  getTickets: async (params = {}) => {
    const response = await api.get('/support/tickets', { params });
    return response.data;
  },

  getTicketConversation: async (ticketId, params = {}) => {
    const response = await api.get(`/support/tickets/${ticketId}/conversation`, { params });
    return response.data;
  },

  getTicketContext: async (ticketId) => {
    const response = await api.get(`/support/tickets/${ticketId}/context`);
    return response.data;
  },

  replyToTicket: async (ticketId, message, file) => {
    const body = file
      ? (() => {
          const fd = new FormData();
          if (message) fd.append('message', message);
          fd.append('attachment', { uri: file.uri, type: file.type || 'application/octet-stream', name: file.fileName || 'attachment' });
          return fd;
        })()
      : { message };
    const config = file ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const response = await api.post(`/support/tickets/${ticketId}/reply`, body, config);
    return response.data;
  },

  editReply: async (ticketId, replyId, message) => {
    const response = await api.patch(`/support/tickets/${ticketId}/reply/${replyId}`, { message });
    return response.data;
  },

  deleteReply: async (ticketId, replyId) => {
    const response = await api.delete(`/support/tickets/${ticketId}/reply/${replyId}`);
    return response.data;
  },

  markReplyRead: async (ticketId, replyId) => {
    const response = await api.patch(`/support/tickets/${ticketId}/reply/${replyId}/read`);
    return response.data;
  },

  sendTyping: async (ticketId) => {
    const response = await api.post(`/support/tickets/${ticketId}/typing`);
    return response.data;
  },

  assignTicket: async (ticketId, assignedTo) => {
    const payload = assignedTo ? { assigned_to: assignedTo } : {};
    const response = await api.patch(`/support/tickets/${ticketId}/assign`, payload);
    return response.data;
  },

  takeoverTicket: async (ticketId) => {
    const response = await api.post(`/support/tickets/${ticketId}/takeover`);
    return response.data;
  },

  resolveTicket: async (ticketId, resolutionSummary = '') => {
    const response = await api.patch(`/support/tickets/${ticketId}/resolve`, {
      resolution_summary: resolutionSummary,
    });
    return response.data;
  },

  escalateToDepartment: async (ticketId, department, note = '') => {
    const response = await api.post(`/support/tickets/${ticketId}/escalate-department`, {
      department,
      note,
    });
    return response.data;
  },

  updateEscalationStatus: async (ticketId, status, note = '') => {
    const response = await api.patch(`/support/tickets/${ticketId}/escalation-status`, {
      status,
      note,
    });
    return response.data;
  },

  getInternalNotes: async (ticketId, params = {}) => {
    const response = await api.get(`/support/tickets/${ticketId}/internal-notes`, { params });
    return response.data;
  },

  addInternalNote: async (ticketId, message) => {
    const response = await api.post(`/support/tickets/${ticketId}/internal-notes`, { message });
    return response.data;
  },

  editInternalNote: async (ticketId, noteId, message) => {
    const response = await api.patch(`/support/tickets/${ticketId}/internal-notes/${noteId}`, { message });
    return response.data;
  },

  deleteInternalNote: async (ticketId, noteId) => {
    const response = await api.delete(`/support/tickets/${ticketId}/internal-notes/${noteId}`);
    return response.data;
  },

  getActivity: async (params = {}) => {
    const response = await api.get('/support/activity', { params });
    return response.data;
  },

  getAllActivity: async (params = {}) => {
    const response = await api.get('/support/activity/all', { params });
    return response.data;
  },

  getAdminPool: async () => {
    const response = await api.get('/support/admin-pool');
    return response.data;
  },

  setLeadStatus: async (userId, isLead) => {
    const response = await api.patch(`/support/admin-pool/${userId}/lead`, {
      is_lead: Boolean(isLead),
    });
    return response.data;
  },

  getDashboard: async (level = 'lga') => {
    const response = await api.get('/support/admin/dashboard', { params: { level } });
    return response.data;
  },

  contactSupport: async (data) => {
    const response = await api.post('/support/contact', data, guestRequestConfig());
    return response.data;
  },

  contactLookup: async (proofOrEmail) => {
    const proof = normalizeGuestProof(proofOrEmail);
    const response = await api.post(
      '/support/tickets/contact-lookup',
      proof,
      guestRequestConfig()
    );
    return response.data;
  },

  getContactConversation: async (ticketId, proofOrEmail) => {
    const proof = normalizeGuestProof(proofOrEmail);
    const response = await api.post(
      '/support/tickets/contact-conversation',
      { ticketId, ...proof },
      guestRequestConfig()
    );
    return response.data;
  },

  contactReply: async (ticketId, proofOrEmail, message, file) => {
    const proof = normalizeGuestProof(proofOrEmail);
    const fd = new FormData();
    fd.append('ticketId', ticketId);
    if (proof.guestAccessToken) {
      fd.append('guestAccessToken', proof.guestAccessToken);
    } else if (proof.email) {
      fd.append('email', proof.email);
    }
    if (message) fd.append('message', message);
    if (file) {
      fd.append('attachment', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.fileName || 'attachment',
      });
    }
    const response = await api.post('/support/tickets/contact-reply', fd, {
      ...guestRequestConfig(),
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getTypingStatus: async (ticketId, proofOrEmail) => {
    const proof = normalizeGuestProof(proofOrEmail);
    const response = await api.get(
      `/support/tickets/${ticketId}/typing-status`,
      proof.guestAccessToken
        ? guestRequestConfig(proof.guestAccessToken)
        : { ...guestRequestConfig(), params: { email: proof.email } }
    );
    return response.data;
  },
};
