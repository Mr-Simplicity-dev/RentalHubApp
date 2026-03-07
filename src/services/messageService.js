import api from './api';

export const messageService = {
  sendMessage: async (messageData) => {
    const response = await api.post('/messages', messageData);
    return response.data;
  },

  getConversations: async () => {
    const response = await api.get('/messages/conversations');
    return response.data;
  },

  getConversationWithUser: async (userId, params = {}) => {
    const response = await api.get(`/messages/conversation/${userId}`, { params });
    return response.data;
  },

  getPropertyMessages: async (propertyId, params = {}) => {
    const response = await api.get(`/messages/property/${propertyId}`, { params });
    return response.data;
  },

  markAsRead: async (messageId) => {
    const response = await api.patch(`/messages/${messageId}/read`);
    return response.data;
  },

  markConversationAsRead: async (userId) => {
    const response = await api.patch(`/messages/conversation/${userId}/read-all`);
    return response.data;
  },

  deleteMessage: async (messageId) => {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/messages/unread/count');
    return response.data;
  },

  getRecipients: async (params = {}) => {
    const response = await api.get('/messages/recipients', { params });
    return response.data;
  },

  getEscalations: async () => {
    const response = await api.get('/messages/escalations');
    return response.data;
  },
};
