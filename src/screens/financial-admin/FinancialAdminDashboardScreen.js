import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import { getErrorMessage, pickObject } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const FinancialAdminDashboardScreen = ({ navigation }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const response = await financialAdminService.getFinancialOverview();
      setOverview(pickObject(response, ['data', 'overview']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load financial overview'),
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = overview?.total_revenue ?? overview?.totalRevenue ?? 0;
  const pendingPayments = overview?.pending_payments ?? overview?.pendingPayments ?? 0;
  const completedTransactions = overview?.completed_transactions ?? overview?.completedTransactions ?? 0;

  const summaryCards = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: '#0284c7' },
    { label: 'Pending Payments', value: formatCurrency(pendingPayments), color: '#d97706' },
    { label: 'Completed', value: String(completedTransactions), color: '#059669' },
  ];

  const actionCards = [
    { label: 'Revenue Reports', icon: 'trending-up-outline', route: 'FinancialRevenueReport' },
    { label: 'Transactions', icon: 'swap-horizontal-outline', route: 'FinancialTransactions' },
    { label: 'Withdrawals', icon: 'cash-outline', route: 'FinancialWithdrawals' },
    { label: 'Commissions', icon: 'people-outline', route: 'FinancialCommissions' },
    { label: 'Invoices', icon: 'document-text-outline', route: 'FinancialInvoices' },
    { label: 'Refunds', icon: 'arrow-undo-outline', route: 'FinancialRefunds' },
    { label: 'Tax Reports', icon: 'calculator-outline', route: 'FinancialTaxReports' },
    { label: 'Payment Gateways', icon: 'card-outline', route: 'FinancialGateways' },
    { label: 'Alerts', icon: 'alert-circle-outline', route: 'FinancialAlerts' },
    { label: 'Audit Trail', icon: 'file-tray-full-outline', route: 'FinancialAuditTrail' },
    { label: 'Settings', icon: 'settings-outline', route: 'FinancialSettings' },
    { label: 'Export Data', icon: 'download-outline', route: 'FinancialExport' },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Financial Admin</Text>

      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <View key={card.label} style={[styles.summaryCard, { borderLeftColor: card.color }]}>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            <Text style={[styles.summaryValue, { color: card.color }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {actionCards.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.route)}
          >
            <Icon name={action.icon} size={28} color="#0284c7" />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  summaryRow: { gap: 8, marginBottom: 20 },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: { color: '#64748b', fontSize: 13 },
  summaryValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '30%',
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: { color: '#0f172a', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

export default FinancialAdminDashboardScreen;
