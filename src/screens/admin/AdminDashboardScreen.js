import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
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
import WorkspaceBoard from '../../components/dashboard/WorkspaceBoard';

const AdminDashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const role = String(user?.user_type || '').trim().toLowerCase();
  const isCoreAdmin = role === 'admin' || role === 'super_admin';

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
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

  const workspaceGroups = [
    {
      title: 'People & Verification',
      icon: 'people-outline',
      items: [
        {
          label: 'Users',
          icon: 'people-outline',
          tourTarget: role === 'lga_admin' ? 'lga_admin_services' : 'admin_workspaces',
          onPress: () => navigation.navigate('AdminUsers'),
        },
        {
          label: 'Verifications',
          icon: 'shield-checkmark-outline',
          onPress: () => navigation.navigate('AdminVerifications'),
        },
        ...(isCoreAdmin
          ? [
              {
                label: 'Agent Assignments',
                icon: 'people-circle-outline',
                onPress: () => navigation.navigate('AdminAgentAssignments'),
              },
            ]
          : []),
        ...(user?.is_recruitment_admin === true
          ? [
              {
                label: 'Recruitment',
                icon: 'briefcase-outline',
                onPress: () => navigation.navigate('RecruitmentAdmin'),
              },
            ]
          : []),
      ],
    },
    {
      title: 'Properties & Trust',
      icon: 'home-outline',
      items: [
        {
          label: 'Properties',
          icon: 'business-outline',
          onPress: () => navigation.navigate('AdminProperties'),
        },
        {
          label: 'Applications',
          icon: 'documents-outline',
          onPress: () => navigation.navigate('AdminApplications'),
        },
        ...(isCoreAdmin
          ? [
              {
                label: 'Compliance & Risk',
                icon: 'shield-outline',
                tourTarget: 'admin_compliance',
                onPress: () => navigation.navigate('AdminCompliance'),
              },
            ]
          : []),
      ],
    },
    ...(isCoreAdmin
      ? []
      : [
          {
            title: 'Local services',
            icon: 'construct-outline',
            items: [
              {
                label: 'Transportation',
                icon: 'car-outline',
                onPress: () => navigation.navigate('AdminTransportationDashboard'),
              },
              {
                label: 'Fumigation & Cleaning',
                icon: 'sparkles-outline',
                onPress: () => navigation.navigate('AdminFumigationDashboard'),
              },
            ],
          },
        ]),
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow="OPERATIONS"
        title={role === 'lga_admin' ? 'LGA administration hub' : 'Administration hub'}
        subtitle="Monitor users, listings, verification and local workflows."
        icon="settings-outline"
        onRefresh={loadStats}
      />
      <AdminAccountActions navigation={navigation} />

      <MetricGrid
        tourTarget={role === 'lga_admin' ? 'lga_admin_overview' : 'admin_metrics'}
        tourLabel="Administration metrics"
      >
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
        <WorkspaceBoard groups={workspaceGroups} />
      </DashboardSection>

      <DashboardSection
        title="Property request workflow"
        tourTarget={role === 'lga_admin' ? 'lga_admin_requests' : 'admin_workflows'}
      >
        <PropertyRequestWorkflowSection mode="state" title="Tenant Property Requests" />
      </DashboardSection>

      <DashboardSection
        title="Tenancy controls"
        tourTarget={role === 'lga_admin' ? 'lga_admin_tenancy' : undefined}
      >
        <TenancyWorkflowSection title="LGA Tenancy Grace and Refund Enablement" />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminDashboardScreen;
