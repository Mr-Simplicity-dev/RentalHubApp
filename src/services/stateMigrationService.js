import api from './api';

export const stateMigrationService = {
  myRequests: async () => {
    const response = await api.get('/state-migrations/my');
    return response.data;
  },

  requestMigration: async ({ to_state, reason }) => {
    const response = await api.post('/state-migrations/request', { to_state, reason });
    return response.data;
  },
};
