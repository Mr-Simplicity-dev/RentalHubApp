import api from './api';

export const approvalService = {
  // Admin approvals
  fetchPendingAdminApprovals: async () => {
    const response = await api.get('/super/pending-admins');
    return response.data?.data || [];
  },

  approvePendingAdmin: async (adminId) => {
    const response = await api.patch(`/super/pending-admins/${adminId}/approve`);
    return response.data;
  },

  rejectPendingAdmin: async (adminId) => {
    const response = await api.patch(`/super/pending-admins/${adminId}/reject`);
    return response.data;
  },

  // Escalations
  fetchEscalations: async () => {
    const response = await api.get('/messages/escalations');
    return response.data?.data || [];
  },

  markEscalationHandled: async (escalationId) => {
    const response = await api.patch(`/messages/escalations/${escalationId}/handled`);
    return response.data;
  },

  convertEscalationToTicket: async (escalationId) => {
    const response = await api.post(`/messages/escalations/${escalationId}/ticket`);
    return response.data;
  },

  updateEscalationTicketStatus: async (escalationId, ticketStatus) => {
    const response = await api.patch(`/messages/escalations/${escalationId}/ticket-status`, {
      ticket_status: ticketStatus,
    });
    return response.data;
  },

  requestSensitiveActionEscalation: async ({ actionType, summary, payload }) => {
    const superAdminRes = await api.get('/messages/recipients', {
      params: { role: 'super_admin' },
    });

    const recipients = superAdminRes.data?.data || [];
    const superAdmin = recipients.find(
      (item) => String(item.user_type || '').toLowerCase() === 'super_admin'
    );

    if (!superAdmin?.id) {
      throw new Error('No active super admin recipient found for escalation');
    }

    const escalation = {
      subject: `[Escalation] ${String(actionType || 'general_review').replace(/_/g, ' ')}`,
      message_text: JSON.stringify(
        {
          escalation_type: actionType,
          summary: summary || '',
          payload: payload || {},
          requested_at: new Date().toISOString(),
        },
        null,
        2
      ),
    };

    const response = await api.post('/messages', {
      receiver_id: superAdmin.id,
      message_type: 'escalation',
      subject: escalation.subject,
      message_text: escalation.message_text,
    });

    return response.data;
  },
};
