import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {StyleSheet} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
import { colors, typography } from '../../theme';
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

const LABELS = {
  lga: { eyebrow: 'LGA SUPPORT', title: 'Local support desk' },
  state: { eyebrow: 'STATE SUPPORT', title: 'State support desk' },
  super: { eyebrow: 'SUPER SUPPORT', title: 'National support command centre' },
};

const AdminSupportDashboardScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const role = String(user?.user_type || '').trim().toLowerCase();
  const level = useMemo(() => {
    if (role === 'super_admin' || role === 'super_support_admin') return 'super';
    if (role === 'state_support_admin') return 'state';
    return 'lga';
  }, [role]);
  const isSuperSupport = level === 'super';
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/support/admin/dashboard', { params: { level } });
      setDashboard(pickObject(response.data, ['data', 'dashboard']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load support dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [level]);

  const openTickets = dashboard?.open_tickets ?? dashboard?.openTickets ?? 0;
  const closedTickets = dashboard?.closed_tickets ?? dashboard?.closedTickets ?? 0;
  const escalatedTickets = dashboard?.escalated_tickets ?? dashboard?.escalatedTickets ?? 0;
  const avgResponse = dashboard?.avg_response_hours ?? dashboard?.avgResponseTime ?? '-';
  const poolAdmins = dashboard?.pool_admins ?? dashboard?.total_admins ?? null;

  const summaryCards = [
    { label: 'Open', value: String(openTickets), icon: 'chatbox-ellipses-outline', color: colors.blue },
    { label: 'Closed', value: String(closedTickets), icon: 'checkmark-circle-outline', color: colors.success },
    { label: 'Escalated', value: String(escalatedTickets), icon: 'alert-circle-outline', color: '#A66B00' },
    ...(poolAdmins !== null ? [{ label: 'Pool Admins', value: String(poolAdmins), icon: 'people-outline', color: '#7C3AED' }] : []),
    { label: 'Avg Response', value: String(avgResponse), icon: 'time-outline', color: '#0891B2' },
  ];

  const label = LABELS[level] || LABELS.lga;

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow={label.eyebrow}
        title={label.title}
        subtitle={`Support ticket overview for the ${level} administrative level.`}
        icon="chatbubbles-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title="Support tools">
        <ActionRow
          title="Support tickets"
          subtitle="Review open, escalated and resolved tickets."
          icon="chatbox-ellipses-outline"
          onPress={() => navigation.navigate('SupportTickets')}
        />
        <ActionRow
          title="Messages"
          subtitle="Open staff and customer conversations."
          icon="chatbubbles-outline"
          onPress={() => navigation.navigate('Messages')}
        />
        <ActionRow
          title="Notifications"
          subtitle="Review system alerts and updates."
          icon="notifications-outline"
          onPress={() => navigation.navigate('Notifications')}
        />
        <ActionRow
          title="Admin Pool"
          subtitle="View support admin pool and promote leads."
          icon="people-outline"
          onPress={() => navigation.navigate('AdminPool')}
        />
        <ActionRow
          title="Activity Feed"
          subtitle="Track admin actions and system events."
          icon="pulse-outline"
          onPress={() => navigation.navigate('ActivityFeed')}
        />
        {isSuperSupport ? (
          <ActionRow
            title="All Activity"
            subtitle="Full activity log across all locations."
            icon="list-outline"
            onPress={() => navigation.navigate('AllActivity')}
          />
        ) : null}
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminSupportDashboardScreen;
