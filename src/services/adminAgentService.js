import api from './api';

export const adminAgentService = {
  getAssignments: async (params = {}) => {
    const response = await api.get('/admin/agents/assignments', { params });
    return response.data;
  },

  createAssignment: async (payload) => {
    const response = await api.post('/admin/agents/assignments', payload);
    return response.data;
  },

  updatePermissions: async (assignmentId, permissions) => {
    const response = await api.put(`/admin/agents/assignments/${assignmentId}/permissions`, {
      permissions,
    });
    return response.data;
  },

  revokeAssignment: async (assignmentId, reason) => {
    const response = await api.post(`/admin/agents/assignments/${assignmentId}/revoke`, {
      reason,
    });
    return response.data;
  },

  deactivateAssignment: async (assignmentId, reason) => {
    const response = await api.post(`/admin/agents/assignments/${assignmentId}/deactivate`, {
      reason,
    });
    return response.data;
  },

  reactivateAssignment: async (assignmentId, reason) => {
    const response = await api.post(`/admin/agents/assignments/${assignmentId}/reactivate`, {
      reason,
    });
    return response.data;
  },
};
