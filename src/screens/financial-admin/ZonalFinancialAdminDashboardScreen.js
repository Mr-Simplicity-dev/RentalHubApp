import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {ScrollView,
  StyleSheet,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import AdminAccountActions from '../../components/admin/AdminAccountActions';
import {
  InfoRow,
  PremiumCard,
  StatusPill,
} from '../../components/common/PremiumLayout';
import {
  ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';
import { financialAdminService } from '../../services/financialAdminService';
import { colors, typography, typeScale } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

import AppText from '../../components/common/AppText';
import { WithdrawalRequestModal } from './LgaFinancialAdminDashboardScreen';

const formatCurrency = (value, fallback = '₦0') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return `₦${numeric.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusColor = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['approved', 'paid', 'completed'].includes(normalized)) return colors.success;
  if (['rejected', 'failed', 'cancelled'].includes(normalized)) return colors.danger;
  return colors.warning;
};

const maskAccountNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Not provided';
  return `••••••${digits.slice(-4)}`;
};

const ZonalFinancialAdminDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const { user } = useContext(AuthContext);
  const [snapshot, setSnapshot] = useState({});
  const [withdrawals, setWithdrawals] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    const [snapshotResult, historyResult, overviewResult] = await Promise.allSettled([
      financialAdminService.getPersonalWithdrawable(),
      financialAdminService.getPersonalWithdrawalHistory(),
      financialAdminService.getZonalOverview(),
    ]);

    const failures = [];
    if (snapshotResult.status === 'fulfilled') {
      setSnapshot(pickObject(snapshotResult.value, ['data', 'snapshot']) || {});
    } else {
      failures.push(getErrorMessage(snapshotResult.reason, 'Could not load your commission balance.'));
    }
    if (historyResult.status === 'fulfilled') {
      setWithdrawals(pickList(historyResult.value, ['data', 'withdrawals', 'history']));
    } else {
      failures.push(getErrorMessage(historyResult.reason, 'Could not load your withdrawal history.'));
    }
    if (overviewResult.status === 'fulfilled') {
      setOverview(pickObject(overviewResult.value, ['data']) || null);
    } else {
      failures.push(getErrorMessage(overviewResult.reason, 'Could not load zone finance overview.'));
    }

    if (failures.length) {
      const message = failures.join(' ');
      setLoadError(message);
      Toast.show({ type: 'error', text1: ui("Some finance data did not load"), text2: message });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const zone = user?.assigned_zone || user?.zone || '';
  const jurisdiction = zone ? `${zone} Zone` : 'No assigned zone is configured for this account.';

  const withdrawable = Number(snapshot?.withdrawable_amount || 0);
  const totalEarned = Number(snapshot?.total_earned || 0);
  const pendingCount = withdrawals.filter(
    (item) => String(item?.status || 'pending').toLowerCase() === 'pending'
  ).length;
  const totalRequested = withdrawals.reduce(
    (sum, item) => sum + Number(item?.amount || 0),
    0
  );

  const zoneMetrics = useMemo(() => {
    if (!overview) return [];
    return [
      { label: ui("Zone revenue"), value: formatCurrency(overview?.totalRevenue) },
      { label: ui("Completed"), value: String(overview?.completedPayments || 0) },
      { label: ui("Pending payouts"), value: String(overview?.withdrawals?.pending || 0) },
      { label: ui("Paid out"), value: formatCurrency(overview?.withdrawals?.paidOut) },
    ];
  }, [overview, interfaceLanguage]);

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadFinanceData}>
      <DashboardHero
        eyebrow={ui("ZONAL FINANCE")}
        icon="wallet-outline"
        onRefresh={loadFinanceData}
        subtitle={ui("Monitor finance across your zone and manage your commission payouts.")}
        title={ui("Finance workspace")}
      />
      <AdminAccountActions navigation={navigation} />

      <DashboardNotice
        title={ui("Assigned jurisdiction")}
        message={jurisdiction}
        variant={zone ? 'info' : 'warning'}
      />

      {loadError ? (
        <View style={styles.noticeSpacing}>
          <DashboardNotice
            message={ui("{value0} Pull down or use the refresh icon to try again.", {value0: (loadError)})}
            title={ui("Partial data shown")}
            variant="warning"
          />
        </View>
      ) : null}

      <View style={styles.metricsSpacing}>
        <MetricGrid tourTarget="lga_financial_overview" tourLabel={ui("Zonal finance overview")}>
          <MetricCard color={colors.success} icon="wallet-outline" label={ui("Withdrawable")} value={formatCurrency(withdrawable)} />
          <MetricCard color={colors.blue} icon="trending-up-outline" label={ui("Total earned")} value={formatCurrency(totalEarned)} />
          <MetricCard color={colors.navy} icon="receipt-outline" label={ui("Requests")} value={String(withdrawals.length)} />
          <MetricCard color={colors.warning} icon="time-outline" label={ui("Pending")} value={String(pendingCount)} />
        </MetricGrid>
      </View>

      {overview ? (
        <DashboardSection subtitle={ui("Aggregated payments and payouts for your zone.")} title={ui("Zone overview")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.zoneMetricRow}>
              {zoneMetrics.map((metric) => (
                <View key={metric.label} style={styles.zoneMetricCard}>
                  <AppText style={styles.zoneMetricLabel}>{metric.label}</AppText>
                  <AppText style={styles.zoneMetricValue}>{metric.value}</AppText>
                </View>
              ))}
            </View>
          </ScrollView>
        </DashboardSection>
      ) : null}

      <DashboardSection subtitle={ui("Requests are reviewed through the financial approval workflow.")} title={ui("Commission withdrawal")}>
        <ActionRow
          badge={withdrawable >= 1000 ? 'Available' : 'Below minimum'}
          icon="cash-outline"
          onPress={() => setWithdrawalModalVisible(true)}
          subtitle={ui("Current withdrawable balance: {value0}", {value0: (formatCurrency(withdrawable))})}
          tourTarget="lga_financial_withdrawal"
          title={ui("Request personal withdrawal")}
        />
      </DashboardSection>

      <DashboardSection subtitle={ui("Total requested: {value0}", {value0: (formatCurrency(totalRequested))})} title={ui("Withdrawal history")} tourTarget="lga_financial_history">
        {withdrawals.length === 0 ? (
          <PremiumCard style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="receipt-outline" size={23} color={colors.blue} />
            </View>
            <AppText style={styles.emptyTitle}>{ui("No withdrawal requests yet")}</AppText>
            <AppText style={styles.emptyMessage}>{ui("Your personal commission payout requests will appear here.")}</AppText>
          </PremiumCard>
        ) : (
          withdrawals.map((withdrawal, index) => {
            const status = String(withdrawal?.status || 'pending').toLowerCase();
            return (
              <PremiumCard key={String(withdrawal?.id || `${withdrawal?.requested_at || 'request'}-${index}`)}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyAmountWrap}>
                    <AppText style={styles.historyLabel}>{ui("Requested amount")}</AppText>
                    <AppText style={styles.historyAmount}>{formatCurrency(withdrawal?.amount)}</AppText>
                  </View>
                  <StatusPill label={status} color={getStatusColor(status)} />
                </View>
                <InfoRow
                  icon="business-outline"
                  label={ui("Bank account")}
                  value={`${withdrawal?.bank_name || 'Bank not available'} · ${maskAccountNumber(withdrawal?.account_number)}`}
                />
                <InfoRow icon="person-outline" label={ui("Account name")} value={withdrawal?.account_name || 'Not available'} />
                <InfoRow icon="calendar-outline" label={ui("Requested")} value={formatDate(withdrawal?.requested_at || withdrawal?.created_at)} />
              </PremiumCard>
            );
          })
        )}
      </DashboardSection>

      <WithdrawalRequestModal
        onClose={() => setWithdrawalModalVisible(false)}
        onSubmitted={loadFinanceData}
        visible={withdrawalModalVisible}
        withdrawable={withdrawable}
      />
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  noticeSpacing: {
    marginTop: 10,
  },
  metricsSpacing: {
    marginTop: 16,
  },
  emptyCard: {
    alignItems: 'center',
    marginBottom: 0,
    paddingVertical: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
    marginTop: 12,
  },
  emptyMessage: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 5,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  historyHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  historyAmountWrap: {
    flex: 1,
  },
  historyLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  historyAmount: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    marginTop: 3,
  },
  zoneMetricRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 6,
  },
  zoneMetricCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 132,
    padding: 14,
  },
  zoneMetricLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  zoneMetricValue: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    marginTop: 6,
  },
});

export default ZonalFinancialAdminDashboardScreen;
