import api from './api';

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

  replyToTicket: async (ticketId, message) => {
    const response = await api.post(`/support/tickets/${ticketId}/reply`, { message });
    return response.data;
  },
};
