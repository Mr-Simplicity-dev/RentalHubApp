import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const FinancialAdminDashboardScreen = ({ navigation }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
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
    { label: 'Revenue', value: formatCurrency(totalRevenue), icon: 'trending-up-outline', color: colors.blue },
    { label: 'Pending', value: formatCurrency(pendingPayments), icon: 'time-outline', color: '#A66B00' },
    { label: 'Completed', value: String(completedTransactions), icon: 'checkmark-circle-outline', color: colors.success },
  ];

  const actionCards = [
    { label: 'Revenue Reports', icon: 'trending-up-outline', route: 'FinancialRevenueReport' },
    { label: 'Transactions', icon: 'swap-horizontal-outline', route: 'FinancialTransactions' },
    { label: 'Withdrawals', icon: 'cash-outline', route: 'FinancialWithdrawals' },
    { label: 'Commissions', icon: 'people-outline', route: 'FinancialCommissions' },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOverview} tintColor={colors.blue} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Icon name="analytics-outline" size={23} color={colors.gold} /></View>
          <TouchableOpacity style={styles.refreshButton} onPress={loadOverview}><Icon name="refresh" size={19} color={colors.white} /></TouchableOpacity>
        </View>
        <Text style={styles.eyebrow}>FINANCIAL CONTROL</Text>
        <Text style={styles.title}>Money at a glance</Text>
        <Text style={styles.subtitle}>Review revenue, settlements, commissions and payout activity.</Text>
      </View>

      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <View key={card.label} style={styles.summaryCard}>
            <View style={[styles.metricIcon, { backgroundColor: `${card.color}16` }]}><Icon name={card.icon} size={18} color={card.color} /></View>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            <Text style={styles.summaryValue}>{card.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Financial operations</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('RecruitmentAdmin')}><View style={styles.actionIcon}><Icon name='people-outline' size={21} color={colors.blue} /></View><Text style={styles.actionLabel}>Recruitment</Text><Icon name="chevron-forward" size={17} color={colors.muted} /></TouchableOpacity>
        {actionCards.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.route)}
          >
            <View style={styles.actionIcon}><Icon name={action.icon} size={21} color={colors.blue} /></View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Icon name="chevron-forward" size={17} color={colors.muted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 22, marginBottom: 14, ...shadows.soft },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  refreshButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: typography.semibold, fontSize: 11, letterSpacing: 1.2, color: colors.gold },
  title: { marginTop: 8, fontFamily: typography.bold, fontSize: 28, color: colors.white },
  subtitle: { marginTop: 7, fontFamily: typography.regular, lineHeight: 20, color: '#B9C9E5' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 23 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 11,
  },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  summaryLabel: { fontFamily: typography.regular, color: colors.muted, fontSize: 11 },
  summaryValue: { fontFamily: typography.bold, fontSize: 14, color: colors.ink, marginTop: 4 },
  sectionTitle: { fontFamily: typography.bold, fontSize: 18, color: colors.ink, marginBottom: 10 },
  actionsGrid: { gap: 9 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  actionLabel: { flex: 1, fontFamily: typography.semibold, color: colors.ink },
});

export default FinancialAdminDashboardScreen;
