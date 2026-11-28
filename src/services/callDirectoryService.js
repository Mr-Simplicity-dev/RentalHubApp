import api from './api';

export const inferFallbackCallPolicy = (user) => {
  const role = String(user?.user_type || user?.role || '').trim().toLowerCase();
  if (role === 'super_admin') {
    return {
      role,
      mode: 'platform_all',
      canChatSupport: false,
      canCallSupport: false,
      canCallBoss: false,
      canCallTeammates: false,
      canCallSubordinates: true,
      canCallAnyone: true,
    };
  }
  if (role === 'tenant' || role === 'landlord') {
    return {
      role,
      mode: 'support_only',
      canChatSupport: true,
      canCallSupport: true,
      canCallBoss: false,
      canCallTeammates: false,
      canCallSubordinates: false,
      canCallAnyone: false,
    };
  }
  if (role === 'marketing_agent') {
    return {
      role,
      mode: 'support_and_boss',
      canChatSupport: true,
      canCallSupport: true,
      canCallBoss: true,
      canCallTeammates: false,
      canCallSubordinates: false,
      canCallAnyone: false,
    };
  }
  if (role === 'agent') {
    return {
      role,
      mode: 'support_and_boss',
      canChatSupport: true,
      canCallSupport: true,
      canCallBoss: true,
      canCallTeammates: false,
      canCallSubordinates: false,
      canCallAnyone: false,
    };
  }
  if (
    role.startsWith('super_') ||
    role.startsWith('zonal_') ||
    role.startsWith('state_') ||
    role === 'financial_admin' ||
    role === 'recruitment_admin'
  ) {
    return {
      role,
      mode: 'admin_subordinates',
      canChatSupport: false,
      canCallSupport: false,
      canCallBoss: true,
      canCallTeammates: false,
      canCallSubordinates: true,
      canCallAnyone: false,
    };
  }
  return {
    role,
    mode: 'boss_and_support',
    canChatSupport: true,
    canCallSupport: true,
    canCallBoss: true,
    canCallTeammates: false,
    canCallSubordinates: false,
    canCallAnyone: false,
  };
};

export const callDirectoryService = {
  async getPolicy() {
    const response = await api.get('/calls/policy');
    return response?.data?.data || response?.data || null;
  },

  async getDirectory(params = {}) {
    const cleanParams = {};
    if (params.q) cleanParams.q = String(params.q).trim();
    if (params.role && params.role !== 'all') cleanParams.role = String(params.role).trim();
    if (params.state) cleanParams.state = String(params.state).trim();
    if (params.onlineOnly) cleanParams.onlineOnly = 'true';
    if (params.limit) cleanParams.limit = Number(params.limit);
    const response = await api.get('/calls/directory', { params: cleanParams });
    return response?.data?.data || response?.data || { contacts: [], supportOnlineCount: 0 };
  },

  async getHistory(params = {}) {
    const cleanParams = {};
    if (params.filter) cleanParams.filter = String(params.filter).trim();
    if (params.limit) cleanParams.limit = Number(params.limit);
    const response = await api.get('/calls/history', { params: cleanParams });
    return (
      response?.data?.data ||
      response?.data || {
        records: [],
        summary: {
          total_count: 0,
          missed_count: 0,
          incoming_missed_count: 0,
          answered_count: 0,
        },
      }
    );
  },

  async markIncomingMissedCallsAsViewed() {
    const response = await api.patch('/calls/history/viewed');
    return response?.data?.data || response?.data || {};
  },
};

export default callDirectoryService;
