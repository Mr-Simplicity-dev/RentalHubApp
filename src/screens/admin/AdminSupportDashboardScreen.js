import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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
  lga: { get "eyebrow"() { return ui("LGA SUPPORT"); }, get "title"() { return ui("Local support desk"); } },
  state: { get "eyebrow"() { return ui("STATE SUPPORT"); }, get "title"() { return ui("State support desk"); } },
  super: { get "eyebrow"() { return ui("SUPER SUPPORT"); }, get "title"() { return ui("National support command centre"); } },
};

const AdminSupportDashboardScreen = ({ navigation, route }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const { user } = useContext(AuthContext);
  const role = String(user?.user_type || '').trim().toLowerCase();
  const level = useMemo(() => {
    if (role === 'super_admin' || role === 'super_support_admin') return 'super';
    if (role === 'state_support_admin') return 'state';
    return 'lga';
  }, [role, interfaceLanguage]);
  const isSuperSupport = level === 'super';
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/support/admin/dashboard', { params: { level } });
      setDashboard(pickObject(response.data, ['data', 'dashboard']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
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
    { label: ui("Open"), value: String(openTickets), icon: 'chatbox-ellipses-outline', color: colors.blue },
    { label: ui("Closed"), value: String(closedTickets), icon: 'checkmark-circle-outline', color: colors.success },
    { label: ui("Escalated"), value: String(escalatedTickets), icon: 'alert-circle-outline', color: '#A66B00' },
    ...(poolAdmins !== null ? [{ label: ui("Pool Admins"), value: String(poolAdmins), icon: 'people-outline', color: '#7C3AED' }] : []),
    { label: ui("Avg Response"), value: String(avgResponse), icon: 'time-outline', color: '#0891B2' },
  ];

  const label = LABELS[level] || LABELS.lga;

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow={label.eyebrow}
        title={label.title}
        subtitle={ui("Support ticket overview for the {value0} administrative level.", {value0: (level)})}
        icon="chatbubbles-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title={ui("Support tools")}>
        <ActionRow
          title={ui("Support tickets")}
          subtitle={ui("Review open, escalated and resolved tickets.")}
          icon="chatbox-ellipses-outline"
          onPress={() => navigation.navigate('SupportTickets')}
        />
        <ActionRow
          title={ui("Messages")}
          subtitle={ui("Open staff and customer conversations.")}
          icon="chatbubbles-outline"
          onPress={() => navigation.navigate('Messages')}
        />
        <ActionRow
          title={ui("Notifications")}
          subtitle={ui("Review system alerts and updates.")}
          icon="notifications-outline"
          onPress={() => navigation.navigate('Notifications')}
        />
        <ActionRow
          title={ui("Admin Pool")}
          subtitle={ui("View support admin pool and promote leads.")}
          icon="people-outline"
          onPress={() => navigation.navigate('AdminPool')}
        />
        <ActionRow
          title={ui("Activity Feed")}
          subtitle={ui("Track admin actions and system events.")}
          icon="pulse-outline"
          onPress={() => navigation.navigate('ActivityFeed')}
        />
        {isSuperSupport ? (
          <ActionRow
            title={ui("All Activity")}
            subtitle={ui("Full activity log across all locations.")}
            icon="list-outline"
            onPress={() => navigation.navigate('AllActivity')}
          />
        ) : null}
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminSupportDashboardScreen;
