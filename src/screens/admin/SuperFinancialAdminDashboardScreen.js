import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import AdminAccountActions from '../../components/admin/AdminAccountActions';
import { colors } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';
import { AuthContext } from '../../context/AuthContext';

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const SuperFinancialAdminDashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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

  useEffect(() => {
    loadOverview();
  }, []);

  const totalRevenue = overview?.total_revenue ?? overview?.totalRevenue ?? 0;
  const pendingSettlements = overview?.pending_payments ?? overview?.pendingPayments ?? 0;
  const completedTransactions = overview?.completed_transactions ?? overview?.completedTransactions ?? 0;
  const frozenFunds = overview?.frozen_funds ?? overview?.frozenFunds ?? 0;

  const summaryCards = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: 'trending-up-outline', color: colors.blue },
    { label: 'Pending Settlements', value: formatCurrency(pendingSettlements), icon: 'time-outline', color: '#A66B00' },
    { label: 'Completed', value: String(completedTransactions), icon: 'checkmark-circle-outline', color: colors.success },
    { label: 'Frozen Funds', value: formatCurrency(frozenFunds), icon: 'snow-outline', color: colors.danger },
  ];

  const actionCards = [
    { label: 'Revenue Reports', subtitle: 'Track income and settlement trends', icon: 'trending-up-outline', route: 'FinancialRevenueReport' },
    { label: 'Transactions', subtitle: 'Review individual payment activity', icon: 'swap-horizontal-outline', route: 'FinancialTransactions' },
    { label: 'Withdrawals', subtitle: 'Approve and monitor payout requests', icon: 'cash-outline', route: 'FinancialWithdrawals' },
    { label: 'Commissions', subtitle: 'Manage agent and platform commissions', icon: 'people-outline', route: 'FinancialCommissions' },
    { label: 'Controls & Reconciliation', subtitle: 'Audit trails, frozen funds, settlement health and exports', icon: 'shield-checkmark-outline', route: 'FinancialControls' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadOverview}>
      <DashboardHero
        eyebrow="SUPER FINANCIAL"
        title="National financial control"
        subtitle="Oversee revenue, settlements, frozen funds and commission activity nationwide."
        icon="analytics-outline"
        onRefresh={loadOverview}
      />
      <AdminAccountActions navigation={navigation} />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection
        title="Financial operations"
        subtitle="Open a focused workspace instead of managing everything on one page."
      >
        {actionCards.map((action) => (
          <ActionRow
            key={action.route}
            title={action.label}
            subtitle={action.subtitle}
            icon={action.icon}
            onPress={() => navigation.navigate(action.route)}
          />
        ))}
      </DashboardSection>

      {user?.is_recruitment_admin === true ? (
        <DashboardSection title="People operations">
          <ActionRow
            title="Recruitment"
            subtitle="Review roles, candidates and hiring activity."
            icon="people-outline"
            onPress={() => navigation.navigate('RecruitmentAdmin')}
          />
        </DashboardSection>
      ) : null}
    </DashboardScreen>
  );
};

export default SuperFinancialAdminDashboardScreen;
