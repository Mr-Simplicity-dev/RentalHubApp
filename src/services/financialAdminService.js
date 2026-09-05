import api from './api';
import { requestWithOfflineQueue } from './offlineActionQueueService';

export const financialAdminService = {
  getStateAdmins: async (params = {}) => {
    const response = await api.get('/financial-admin/state-admins', { params });
    return response.data;
  },

  createStateAdmin: async (payload) => {
    const response = await api.post('/financial-admin/state-admins/create', payload);
    return response.data;
  },

  manageStateAdminFunds: async ({ admin_id, action, reason }) => {
    const response = await api.post('/financial-admin/state-admins/funds/manage', {
      admin_id,
      action,
      reason,
    });
    return response.data;
  },

  updateStateAdminCommissionRate: async ({ admin_id, commission_rate }) => {
    const response = await api.put('/financial-admin/state-admins/commission-rate', {
      admin_id,
      commission_rate,
    });
    return response.data;
  },

  getFinancialOverview: async () => {
    const response = await api.get('/financial-admin/stats/realtime');
    const stats = response.data?.data || {};
    const todayRows = Array.isArray(stats.today) ? stats.today : [];
    const completedToday = todayRows
      .filter((row) => row.payment_status === 'completed')
      .reduce((sum, row) => sum + Number(row.today_count || 0), 0);
    const pendingToday = todayRows
      .filter((row) => row.payment_status === 'pending')
      .reduce((sum, row) => sum + Number(row.today_amount || 0), 0);
    return {
      success: true,
      data: {
        overview: {
          total_revenue: Number(stats.week?.week_amount || 0),
          pending_payments: pendingToday,
          completed_transactions: completedToday,
        },
      },
    };
  },

  getRevenueStatistics: async () => {
    const response = await api.get('/financial-admin/stats/realtime');
    const stats = response.data?.data || {};
    const monthTotal = (stats.month || [])
      .reduce((sum, row) => sum + Number(row.month_amount || 0), 0);
    return {
      success: true,
      data: {
        revenue: {
          total_revenue: monthTotal || Number(stats.week?.week_amount || 0),
          growth_percentage: null,
        },
      },
    };
  },

  getTransactionHistory: async (params = {}) => {
    const response = await api.get('/financial-admin/transactions', { params });
    return response.data;
  },

  getAuditTrail: async (params = {}) => {
    const response = await api.get('/financial-admin/audit-trail', { params });
    return response.data;
  },

  getStateAdminPerformance: async (params = {}) => {
    const response = await api.get('/financial-admin/performance/state-admins', { params });
    return response.data;
  },

  getFrozenFunds: async (params = {}) => {
    const response = await api.get('/financial-admin/funds/frozen', { params });
    return response.data;
  },

  freezeFunds: async ({ userId, amount, reason }) => {
    return requestWithOfflineQueue({
      method: 'post',
      path: '/financial-admin/funds/freeze',
      data: {
        user_id: userId,
        amount,
        reason,
      },
      label: `Freeze funds for user #${userId}`,
    });
  },

  getWithdrawalRequests: async () => {
    const response = await api.get('/financial-admin/withdrawals/pending');
    return {
      success: response.data?.success !== false,
      data: { withdrawals: response.data?.data?.pending || [] },
    };
  },

  processWithdrawal: async (withdrawalId, { status, reason } = {}) => {
    const action = status === 'reject' ? 'reject' : 'approve';
    const response = await api.post(
      `/financial-admin/withdrawals/${withdrawalId}/${action}`,
      action === 'reject'
        ? { admin_note: reason || 'Rejected from mobile finance review' }
        : { admin_note: 'Approved from mobile finance review' }
    );
    return response.data;
  },

  getCommissionReports: async () => {
    const response = await api.get('/financial-admin/commissions/summary');
    return response.data;
  },

  getPersonalWithdrawable: async () => {
    const response = await api.get('/financial-admin/commissions/withdrawable');
    return response.data;
  },

  getPersonalWithdrawalHistory: async () => {
    const response = await api.get('/financial-admin/withdrawals/history');
    return response.data;
  },

  getWithdrawalBanks: async () => {
    const response = await api.get('/payments/banks');
    return response.data;
  },

  verifyWithdrawalAccount: async ({ bankCode, bankName, accountNumber }) => {
    const response = await api.post('/payments/verify-account', {
      bank_code: bankCode,
      bank_name: bankName,
      account_number: accountNumber,
    });
    return response.data;
  },

  requestPersonalWithdrawal: async ({
    amount,
    bankName,
    bankCode,
    accountNumber,
    accountName,
  }) => {
    const response = await api.post('/financial-admin/withdraw/request', {
      amount,
      bank_name: bankName,
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
    });
    return response.data;
  },

  getCommissionConfig: async () => {
    const response = await api.get('/financial-admin/commission-config');
    return response.data;
  },

  updateCommissionConfig: async (updates) => {
    const response = await api.put('/financial-admin/commission-config', { updates });
    return response.data;
  },
};
