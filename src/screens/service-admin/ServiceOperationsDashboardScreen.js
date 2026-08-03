import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import AdminAccountActions from '../../components/admin/AdminAccountActions';
import { serviceAdminService } from '../../services/serviceAdminService';
import { getErrorMessage, pickObject } from '../../utils/http';
import { colors } from '../../theme';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const money = (value) => `₦${Number(value || 0).toLocaleString()}`;

const roleLabel = (role = '') => String(role).replace(/_/g, ' ');

const getRoleProfile = (role = '') => {
  if (role.includes('transportation')) {
    return {
      family: 'transportation',
      title: role.includes('super') ? 'Transport command centre' : role.includes('state') ? 'State transport operations' : 'Transportation desk',
      eyebrow: 'TRANSPORT OPERATIONS',
      icon: 'car-outline',
      bookingsType: role.includes('state')
        ? 'transportation_state'
        : role.includes('super')
          ? 'transportation_super'
          : 'transportation',
    };
  }

  if (role.includes('fumigation')) {
    return {
      family: 'fumigation',
      title: role.includes('super') ? 'Fumigation command centre' : role.includes('state') ? 'State service operations' : 'Fumigation & cleaning desk',
      eyebrow: 'FUMIGATION & CLEANING',
      icon: 'sparkles-outline',
      bookingsType: 'fumigation',
    };
  }

  return {
    family: 'support',
    title: role.includes('super') ? 'Support command centre' : role.includes('state') ? 'State support desk' : 'Support desk',
    eyebrow: 'CUSTOMER SUPPORT',
    icon: 'headset-outline',
  };
};

const ServiceOperationsDashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const profile = useMemo(() => getRoleProfile(user?.user_type), [user?.user_type]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      let response = null;
      if (profile.family === 'transportation') {
        if (profile.bookingsType === 'transportation_state') {
          response = await serviceAdminService.getTransportationStateDashboard();
        } else if (profile.bookingsType === 'transportation_super') {
          response = await serviceAdminService.getTransportationSuperDashboard();
        } else {
          response = await serviceAdminService.getTransportationDashboard();
        }
        setOverview(pickObject(response, ['data']) || {});
      } else if (profile.family === 'fumigation') {
        response = await serviceAdminService.getFumigationStats();
        setOverview(pickObject(response, ['data', 'stats']) || {});
      } else {
        const tickets = await serviceAdminService.getSupportTickets({ status: 'all' });
        const list = Array.isArray(tickets?.data) ? tickets.data : [];
        setOverview({
          total_bookings: list.length,
          pending_bookings: list.filter((ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed').length,
          completed_bookings: list.filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed').length,
          total_revenue: 0,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Dashboard unavailable',
        text2: getErrorMessage(error, 'Could not load service dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [profile.family, profile.bookingsType]);

  const stats =
    overview?.overview ||
    overview?.statistics ||
    overview?.national_statistics ||
    overview?.stats ||
    overview ||
    {};
  const isSuperSupport = ['super_admin', 'super_support_admin'].includes(user?.user_type);

  const cards = profile.family === 'support'
    ? [
        { label: 'Tickets', value: stats.total_bookings ?? 0, icon: 'chatbubbles-outline', color: colors.blue },
        { label: 'Open', value: stats.pending_bookings ?? 0, icon: 'alert-circle-outline', color: '#A66B00' },
        { label: 'Resolved', value: stats.completed_bookings ?? 0, icon: 'checkmark-circle-outline', color: colors.success },
      ]
    : [
        { label: 'Bookings', value: stats.total_bookings ?? stats.totalBookings ?? 0, icon: 'calendar-outline', color: colors.blue },
        { label: 'Pending', value: stats.pending_bookings ?? stats.pendingBookings ?? 0, icon: 'time-outline', color: '#A66B00' },
        { label: 'Completed', value: stats.completed_bookings ?? stats.completedBookings ?? 0, icon: 'checkmark-circle-outline', color: colors.success },
        { label: 'Revenue', value: money(stats.total_revenue ?? stats.totalRevenue), icon: 'cash-outline', color: '#7C3AED' },
      ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadOverview}>
      <DashboardHero
        eyebrow={profile.eyebrow}
        title={profile.title}
        subtitle={`Native mobile workspace for ${roleLabel(user?.user_type)}. Quick numbers and queues are now inside the APK.`}
        icon={profile.icon}
        onRefresh={loadOverview}
      />
      <AdminAccountActions navigation={navigation} />

      <MetricGrid
        tourTarget={profile.family === 'support' ? undefined : 'service_dashboard'}
        tourLabel="Service operations overview"
      >
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            {...card}
            tourTarget={
              profile.family !== 'support' && card.label === 'Revenue'
                ? 'service_payments'
                : undefined
            }
          />
        ))}
      </MetricGrid>

      <DashboardSection title="Mobile workspaces">
        {profile.family === 'support' ? (
          <ActionRow
            title="Support ticket queue"
            subtitle="Review open, escalated and unread customer tickets."
            icon="chatbox-ellipses-outline"
            tourTarget="support_tickets"
            onPress={() => navigation.navigate('SupportTickets')}
          />
        ) : (
          <ActionRow
            title="Booking queue"
            subtitle="Review recent bookings in a native mobile list."
            icon={profile.icon}
            tourTarget="service_bookings"
            onPress={() => navigation.navigate('ServiceBookings', { type: profile.bookingsType })}
          />
        )}
        <ActionRow
          title="Messages"
          subtitle="Open staff/customer conversations."
          icon="chatbubbles-outline"
          onPress={() => navigation.navigate('Messages')}
        />
        <ActionRow
          title="Notifications"
          subtitle="Review system alerts and updates."
          icon="notifications-outline"
          onPress={() => navigation.navigate('Notifications')}
        />
      </DashboardSection>

      <DashboardSection
        title="Native operations"
        subtitle="The daily service-admin controls now stay inside the mobile app."
        tourTarget={profile.family === 'support' ? 'support_operations' : undefined}
      >
        {profile.family === 'support' ? (
          <>
            <ActionRow
              title="Admin pool"
              subtitle="Review available support administrators for your permitted jurisdiction."
              icon="people-outline"
              badge="Native"
              onPress={() => navigation.navigate('AdminPool')}
            />
            <ActionRow
              title="Activity feed"
              subtitle="Track recent ticket escalations and support actions."
              icon="reader-outline"
              badge="Native"
              tourTarget="support_audit"
              onPress={() => navigation.navigate('ActivityFeed')}
            />
            <ActionRow
              title="Support dashboard"
              subtitle="See support metrics and ticket governance in-app."
              icon="analytics-outline"
              badge="Native"
              onPress={() => navigation.navigate('AdminSupportDashboard')}
            />
          </>
        ) : null}
        {profile.family === 'transportation' ? (
          <ActionRow
            title="Transport oversight"
            subtitle="Open the transport-native command dashboard for your level."
            icon="speedometer-outline"
            badge="Native"
            onPress={() =>
              navigation.navigate(
                profile.bookingsType === 'transportation_state'
                  ? 'AdminTransportationStateDashboard'
                  : 'ServiceBookings',
                { type: profile.bookingsType }
              )
            }
          />
        ) : null}
        {profile.family === 'fumigation' ? (
          <ActionRow
            title="Fumigation oversight"
            subtitle="Open the native fumigation queue and safety workflow."
            icon="shield-checkmark-outline"
            badge="Native"
            onPress={() =>
              navigation.navigate(
                user?.user_type?.includes('state') ? 'AdminFumigationStateDashboard' : 'ServiceBookings',
                { type: profile.bookingsType }
              )
            }
          />
        ) : null}
        {profile.family === 'support' && isSuperSupport ? (
          <ActionRow
            title="All activity"
            subtitle="Review the complete cross-jurisdiction support audit history."
            icon="list-outline"
            badge="Super"
            onPress={() => navigation.navigate('AllActivity')}
          />
        ) : null}
      </DashboardSection>
    </DashboardScreen>
  );
};

export default ServiceOperationsDashboardScreen;
