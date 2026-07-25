import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { stateAdminService } from '../../services/stateAdminService';
import { colors } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';
import AdminAccountActions from '../../components/admin/AdminAccountActions';
import PropertyRequestWorkflowSection from '../../components/admin/PropertyRequestWorkflowSection';
import TenancyWorkflowSection from '../../components/admin/TenancyWorkflowSection';
import {
  ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const StateAdminDashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const stateId = user?.assigned_state || user?.state_id || user?.stateId;
  const stateName =
    user?.assigned_state_name ||
    user?.assigned_state ||
    user?.state_name ||
    'Your state';
  const hasRecruitmentAccess =
    user?.user_type === 'recruitment_admin' || user?.is_recruitment_admin === true;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = async () => {
    if (!stateId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await stateAdminService.getStateDashboardData();
      setDashboard(pickObject(response, ['data', 'dashboard']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load state dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [stateId]);

  const overview = dashboard?.summary || dashboard || {};
  const overviewCards = [
    { label: 'Managed users', value: overview.total_managed_users ?? '-', icon: 'people-outline', color: colors.blue },
    { label: 'Pending commission', value: formatCurrency(overview.total_pending_commission), icon: 'hourglass-outline', color: '#A66B00' },
    { label: 'Weekly available', value: formatCurrency(overview.weekly_withdrawable), icon: 'wallet-outline', color: colors.success },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow="STATE OPERATIONS"
        title={`${stateName} command centre`}
        subtitle="Manage local users, approvals, tenancy workflows and commissions."
        icon="map-outline"
        onRefresh={loadDashboard}
      />
      <AdminAccountActions navigation={navigation} />

      {!stateId ? (
        <DashboardNotice
          variant="warning"
          title="State assignment required"
          message="This account must be assigned to a state before operational data can be loaded."
        />
      ) : null}

      <MetricGrid>
        {overviewCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection
        title="Management tools"
        subtitle="Move into a focused workflow for each administrative task."
      >
        <ActionRow
          title="Property approvals"
          subtitle="Review state property migrations and approval requests."
          icon="business-outline"
          onPress={() => navigation.navigate('StateAdminMigrations')}
        />
        {hasRecruitmentAccess ? (
          <ActionRow
            title="Recruitment"
            subtitle="Review roles, candidates and hiring activity."
            icon="people-outline"
            onPress={() => navigation.navigate('RecruitmentAdmin')}
          />
        ) : null}
      </DashboardSection>

      <DashboardSection title="Property request workflow">
        <PropertyRequestWorkflowSection mode="state" title="State Tenant Property Requests" />
      </DashboardSection>

      <DashboardSection title="Tenancy controls">
        <TenancyWorkflowSection title="State Tenancy Grace and Refund Enablement" />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default StateAdminDashboardScreen;
