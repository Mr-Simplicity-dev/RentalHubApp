import React, { useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickObject } from '../../utils/http';
import TenancyWorkflowSection from '../../components/admin/TenancyWorkflowSection';
import PropertyRequestWorkflowSection from '../../components/admin/PropertyRequestWorkflowSection';
import AdminAccountActions from '../../components/admin/AdminAccountActions';
import { colors } from '../../theme';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const AdminDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await adminService.getStats();
      setStats(pickObject(response, ['data']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load admin dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cards = [
    { label: 'Users', value: stats.totalUsers ?? stats.total_tenants ?? '-', route: 'AdminUsers', icon: 'people-outline', color: colors.blue },
    { label: 'Properties', value: stats.totalProperties ?? stats.total_properties ?? '-', route: 'AdminProperties', icon: 'business-outline', color: '#7C3AED' },
    { label: 'Applications', value: stats.applications ?? stats.total_applications ?? '-', route: 'AdminApplications', icon: 'documents-outline', color: '#A66B00' },
    { label: 'Verifications', value: stats.pendingVerifications ?? stats.pending_verification ?? '-', route: 'AdminVerifications', icon: 'shield-checkmark-outline', color: colors.success },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow="OPERATIONS"
        title="Administration hub"
        subtitle="Monitor users, listings, verification and local workflows."
        icon="settings-outline"
        onRefresh={loadStats}
      />
      <AdminAccountActions navigation={navigation} />

      <MetricGrid>
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            {...card}
            onPress={() => navigation.navigate(card.route)}
          />
        ))}
      </MetricGrid>

      <DashboardSection
        title="Priority workspaces"
        subtitle="Choose a task area instead of navigating a desktop-style control panel."
      >
        <ActionRow
          title="Compliance & Risk"
          subtitle="Review platform risk and compliance activity."
          icon="shield-outline"
          onPress={() => navigation.navigate('AdminCompliance')}
        />
        <ActionRow
          title="Agent Assignments"
          subtitle="Assign, deactivate and reassign landlord agents."
          icon="people-circle-outline"
          onPress={() => navigation.navigate('AdminAgentAssignments')}
        />
        <ActionRow
          title="Recruitment Admin"
          subtitle="Manage cycles, roles and applicant reviews."
          icon="briefcase-outline"
          onPress={() => navigation.navigate('RecruitmentAdmin')}
        />
      </DashboardSection>

      <DashboardSection title="Property request workflow">
        <PropertyRequestWorkflowSection mode="state" title="Tenant Property Requests" />
      </DashboardSection>

      <DashboardSection title="Tenancy controls">
        <TenancyWorkflowSection title="LGA Tenancy Grace and Refund Enablement" />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminDashboardScreen;
