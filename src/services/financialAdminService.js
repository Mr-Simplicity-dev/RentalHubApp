import api from './api';

export const financialAdminService = {
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
    return {
      success: response.data?.success !== false,
      data: { commissions: response.data?.data?.summary || [] },
    };
  },
};
