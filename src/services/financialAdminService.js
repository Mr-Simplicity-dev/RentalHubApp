import api from './api';

export const financialAdminService = {
  // Get financial overview
  getFinancialOverview: async () => {
    const response = await api.get('/financial-admin/overview');
    return response.data;
  },

  // Get revenue statistics
  getRevenueStatistics: async (params = {}) => {
    const response = await api.get('/financial-admin/revenue', { params });
    return response.data;
  },

  // Get expense statistics
  getExpenseStatistics: async (params = {}) => {
    const response = await api.get('/financial-admin/expenses', { params });
    return response.data;
  },

  // Get profit/loss report
  getProfitLossReport: async (params = {}) => {
    const response = await api.get('/financial-admin/profit-loss', { params });
    return response.data;
  },

  // Get cash flow report
  getCashFlowReport: async (params = {}) => {
    const response = await api.get('/financial-admin/cash-flow', { params });
    return response.data;
  },

  // Get balance sheet
  getBalanceSheet: async (params = {}) => {
    const response = await api.get('/financial-admin/balance-sheet', { params });
    return response.data;
  },

  // Get transaction history
  getTransactionHistory: async (params = {}) => {
    const response = await api.get('/financial-admin/transactions', { params });
    return response.data;
  },

  // Get pending payments
  getPendingPayments: async (params = {}) => {
    const response = await api.get('/financial-admin/pending-payments', { params });
    return response.data;
  },

  // Get completed payments
  getCompletedPayments: async (params = {}) => {
    const response = await api.get('/financial-admin/completed-payments', { params });
    return response.data;
  },

  // Get failed payments
  getFailedPayments: async (params = {}) => {
    const response = await api.get('/financial-admin/failed-payments', { params });
    return response.data;
  },

  // Get refund requests
  getRefundRequests: async (params = {}) => {
    const response = await api.get('/financial-admin/refund-requests', { params });
    return response.data;
  },

  // Process refund
  processRefund: async (refundId, refundData) => {
    const response = await api.post(`/financial-admin/refunds/${refundId}/process`, refundData);
    return response.data;
  },

  // Get withdrawal requests
  getWithdrawalRequests: async (params = {}) => {
    const response = await api.get('/financial-admin/withdrawal-requests', { params });
    return response.data;
  },

  // Process withdrawal
  processWithdrawal: async (withdrawalId, withdrawalData) => {
    const response = await api.post(`/financial-admin/withdrawals/${withdrawalId}/process`, withdrawalData);
    return response.data;
  },

  // Get commission reports
  getCommissionReports: async (params = {}) => {
    const response = await api.get('/financial-admin/commissions', { params });
    return response.data;
  },

  // Calculate commissions
  calculateCommissions: async (calculationData) => {
    const response = await api.post('/financial-admin/commissions/calculate', calculationData);
    return response.data;
  },

  // Distribute commissions
  distributeCommissions: async (distributionData) => {
    const response = await api.post('/financial-admin/commissions/distribute', distributionData);
    return response.data;
  },

  // Get tax reports
  getTaxReports: async (params = {}) => {
    const response = await api.get('/financial-admin/tax-reports', { params });
    return response.data;
  },

  // Generate tax documents
  generateTaxDocuments: async (taxData) => {
    const response = await api.post('/financial-admin/tax-documents/generate', taxData);
    return response.data;
  },

  // Get invoice history
  getInvoiceHistory: async (params = {}) => {
    const response = await api.get('/financial-admin/invoices', { params });
    return response.data;
  },

  // Generate invoice
  generateInvoice: async (invoiceData) => {
    const response = await api.post('/financial-admin/invoices/generate', invoiceData);
    return response.data;
  },

  // Send invoice
  sendInvoice: async (invoiceId, sendData) => {
    const response = await api.post(`/financial-admin/invoices/${invoiceId}/send`, sendData);
    return response.data;
  },

  // Get financial alerts
  getFinancialAlerts: async (params = {}) => {
    const response = await api.get('/financial-admin/alerts', { params });
    return response.data;
  },

  // Create financial alert
  createFinancialAlert: async (alertData) => {
    const response = await api.post('/financial-admin/alerts', alertData);
    return response.data;
  },

  // Update financial alert
  updateFinancialAlert: async (alertId, alertData) => {
    const response = await api.put(`/financial-admin/alerts/${alertId}`, alertData);
    return response.data;
  },

  // Delete financial alert
  deleteFinancialAlert: async (alertId) => {
    const response = await api.delete(`/financial-admin/alerts/${alertId}`);
    return response.data;
  },

  // Get audit trail
  getFinancialAuditTrail: async (params = {}) => {
    const response = await api.get('/financial-admin/audit-trail', { params });
    return response.data;
  },

  // Export financial data
  exportFinancialData: async (exportData) => {
    const response = await api.post('/financial-admin/export', exportData, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get financial settings
  getFinancialSettings: async () => {
    const response = await api.get('/financial-admin/settings');
    return response.data;
  },

  // Update financial settings
  updateFinancialSettings: async (settingsData) => {
    const response = await api.put('/financial-admin/settings', settingsData);
    return response.data;
  },

  // Get payment gateway status
  getPaymentGatewayStatus: async () => {
    const response = await api.get('/financial-admin/payment-gateways');
    return response.data;
  },

  // Update payment gateway
  updatePaymentGateway: async (gatewayId, gatewayData) => {
    const response = await api.put(`/financial-admin/payment-gateways/${gatewayId}`, gatewayData);
    return response.data;
  },

  // Test payment gateway
  testPaymentGateway: async (gatewayId, testData) => {
    const response = await api.post(`/financial-admin/payment-gateways/${gatewayId}/test`, testData);
    return response.data;
  },

  // Get currency rates
  getCurrencyRates: async () => {
    const response = await api.get('/financial-admin/currency-rates');
    return response.data;
  },

  // Update currency rate
  updateCurrencyRate: async (currencyCode, rateData) => {
    const response = await api.put(`/financial-admin/currency-rates/${currencyCode}`, rateData);
    return response.data;
  },

  // Get financial reports
  getFinancialReports: async (params = {}) => {
    const response = await api.get('/financial-admin/reports', { params });
    return response.data;
  },

  // Generate financial report
  generateFinancialReport: async (reportData) => {
    const response = await api.post('/financial-admin/reports/generate', reportData, {
      responseType: 'blob',
    });
    return response.data;
  },
};