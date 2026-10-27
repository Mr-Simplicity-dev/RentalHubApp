import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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
import WorkspaceBoard from '../../components/dashboard/WorkspaceBoard';
import { AuthContext } from '../../context/AuthContext';

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const FinancialAdminDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const { user } = useContext(AuthContext);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await financialAdminService.getFinancialOverview();
      setOverview(pickObject(response, ['data', 'overview']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
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
  const pendingPayments = overview?.pending_payments ?? overview?.pendingPayments ?? 0;
  const completedTransactions = overview?.completed_transactions ?? overview?.completedTransactions ?? 0;

  const summaryCards = [
    { label: ui("Revenue"), value: formatCurrency(totalRevenue), icon: 'trending-up-outline', color: colors.blue },
    { label: ui("Pending"), value: formatCurrency(pendingPayments), icon: 'time-outline', color: '#A66B00' },
    { label: ui("Completed"), value: String(completedTransactions), icon: 'checkmark-circle-outline', color: colors.success },
  ];

  const actionCards = [
    { label: ui("Revenue Reports"), subtitle: ui("Track income and settlement trends"), icon: 'trending-up-outline', route: 'FinancialRevenueReport' },
    { label: ui("Transactions"), subtitle: ui("Review individual payment activity"), icon: 'swap-horizontal-outline', route: 'FinancialTransactions' },
    { label: ui("Withdrawals"), subtitle: ui("Approve and monitor payout requests"), icon: 'cash-outline', route: 'FinancialWithdrawals' },
    { label: ui("Commissions"), subtitle: ui("Manage agent and platform commissions"), icon: 'people-outline', route: 'FinancialCommissions' },
    { label: ui("Controls & Reconciliation"), subtitle: ui("Audit trails, frozen funds, settlement health and exports"), icon: 'shield-checkmark-outline', route: 'FinancialControls' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadOverview}>
      <DashboardHero
        eyebrow={ui("FINANCIAL CONTROL")}
        title={ui("Money at a glance")}
        subtitle={ui("Review revenue, settlements, commissions and payout activity.")}
        icon="analytics-outline"
        onRefresh={loadOverview}
      />
      <AdminAccountActions navigation={navigation} />

      <MetricGrid tourTarget="financial_overview" tourLabel={ui("Financial overview")}>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection
        title={ui("Financial operations")}
        subtitle={ui("Open a focused workspace instead of managing everything on one page.")}
      >
        <WorkspaceBoard
          collapsible
          groups={[
            {
              title: ui("Financial operations"),
              icon: 'cash-outline',
              items: [
                {
                  label: ui("Revenue Reports"),
                  icon: 'trending-up-outline',
                  tourTarget: 'financial_reports',
                  onPress: () => navigation.navigate('FinancialRevenueReport'),
                },
                {
                  label: ui("Transactions"),
                  icon: 'swap-horizontal-outline',
                  tourTarget: 'financial_transactions',
                  onPress: () => navigation.navigate('FinancialTransactions'),
                },
                {
                  label: ui("Withdrawals"),
                  icon: 'cash-outline',
                  onPress: () => navigation.navigate('FinancialWithdrawals'),
                },
                {
                  label: ui("Commissions"),
                  icon: 'people-outline',
                  onPress: () => navigation.navigate('FinancialCommissions'),
                },
                {
                  label: ui("Controls & Reconciliation"),
                  icon: 'shield-checkmark-outline',
                  tourTarget: 'financial_settlements',
                  onPress: () => navigation.navigate('FinancialControls'),
                },
              ],
            },
          ]}
        />
      </DashboardSection>

      {user?.is_recruitment_admin === true ? (
        <DashboardSection title={ui("People operations")}>
          <ActionRow
            title={ui("Recruitment")}
            subtitle={ui("Review roles, candidates and hiring activity.")}
            icon="people-outline"
            onPress={() => navigation.navigate('RecruitmentAdmin')}
          />
        </DashboardSection>
      ) : null}
    </DashboardScreen>
  );
};

export default FinancialAdminDashboardScreen;
