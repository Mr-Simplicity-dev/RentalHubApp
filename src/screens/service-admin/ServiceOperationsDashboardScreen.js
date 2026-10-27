import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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
import WorkspaceBoard from '../../components/dashboard/WorkspaceBoard';

const money = (value) => `₦${Number(value || 0).toLocaleString()}`;

const roleLabel = (role = '') => ui(String(role).replace(/_/g, ' '));

const getRoleProfile = (role = '') => {
  if (role.includes('transportation')) {
    return {
      family: 'transportation',
      title: role.includes('super') ? ui("Transport command centre") : role.includes('state') ? ui("State transport operations") : ui("Transportation desk"),
      eyebrow: ui("TRANSPORT OPERATIONS"),
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
      title: role.includes('super') ? ui("Fumigation command centre") : role.includes('state') ? ui("State service operations") : ui("Fumigation & cleaning desk"),
      eyebrow: ui("FUMIGATION & CLEANING"),
      icon: 'sparkles-outline',
      bookingsType: 'fumigation',
    };
  }

  return {
    family: 'support',
    title: role.includes('super') ? ui("Support command centre") : role.includes('state') ? ui("State support desk") : ui("Support desk"),
    eyebrow: ui("CUSTOMER SUPPORT"),
    icon: 'headset-outline',
  };
};

const ServiceOperationsDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const { user } = useContext(AuthContext);
  const profile = useMemo(() => getRoleProfile(user?.user_type), [user?.user_type, interfaceLanguage]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

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
        text1: ui("Dashboard unavailable"),
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
        { label: ui("Tickets"), value: stats.total_bookings ?? 0, icon: 'chatbubbles-outline', color: colors.blue },
        { label: ui("Open"), value: stats.pending_bookings ?? 0, icon: 'alert-circle-outline', color: '#A66B00' },
        { label: ui("Resolved"), value: stats.completed_bookings ?? 0, icon: 'checkmark-circle-outline', color: colors.success },
      ]
    : [
        { label: ui("Bookings"), value: stats.total_bookings ?? stats.totalBookings ?? 0, icon: 'calendar-outline', color: colors.blue },
        { label: ui("Pending"), value: stats.pending_bookings ?? stats.pendingBookings ?? 0, icon: 'time-outline', color: '#A66B00' },
        { label: ui("Completed"), value: stats.completed_bookings ?? stats.completedBookings ?? 0, icon: 'checkmark-circle-outline', color: colors.success },
        { id: 'revenue', label: ui("Revenue"), value: money(stats.total_revenue ?? stats.totalRevenue), icon: 'cash-outline', color: '#7C3AED' },
      ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadOverview}>
      <DashboardHero
        eyebrow={profile.eyebrow}
        title={profile.title}
        subtitle={ui("Native mobile workspace for {value0}. Quick numbers and queues are now inside the APK.", {value0: (roleLabel(user?.user_type))})}
        icon={profile.icon}
        onRefresh={loadOverview}
      />
      <AdminAccountActions navigation={navigation} />

      <MetricGrid
        tourTarget={profile.family === 'support' ? undefined : 'service_dashboard'}
        tourLabel={ui("Service operations overview")}
      >
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            {...card}
            tourTarget={
              profile.family !== 'support' && card.id === 'revenue'
                ? 'service_payments'
                : undefined
            }
          />
        ))}
      </MetricGrid>

      <DashboardSection title={ui("Mobile workspaces")}>
        <WorkspaceBoard
          collapsible
          groups={[
            {
              title: ui("Daily queue"),
              icon: profile.icon,
              items: [
                ...(profile.family==='support'?[{label:ui("Assisted registration"),icon:'person-add-outline',onPress:()=>navigation.navigate('AssistedRegistration')}]:[]),
                profile.family === 'support'
                  ? {
                      label: ui("Support Tickets"),
                      icon: 'chatbox-ellipses-outline',
                      tourTarget: 'support_tickets',
                      onPress: () => navigation.navigate('SupportTickets'),
                    }
                  : {
                      label: ui("Booking Queue"),
                      icon: profile.icon,
                      tourTarget: 'service_bookings',
                      onPress: () =>
                        navigation.navigate('ServiceBookings', { type: profile.bookingsType }),
                    },
                {
                  label: ui("Messages"),
                  icon: 'chatbubbles-outline',
                  onPress: () => navigation.navigate('Messages'),
                },
                {
                  label: ui("Notifications"),
                  icon: 'notifications-outline',
                  onPress: () => navigation.navigate('Notifications'),
                },
              ],
            },
          ]}
        />
      </DashboardSection>

      <DashboardSection
        title={ui("Native operations")}
        subtitle={ui("The daily service-admin controls now stay inside the mobile app.")}
      >
        <WorkspaceBoard
          collapsible
          groups={[
            {
              title: ui("Service controls"),
              icon: 'construct-outline',
              items: [
                ...(profile.family === 'support'
                  ? [
                      {
                        label: ui("Admin Pool"),
                        icon: 'people-outline',
                        tourTarget: profile.family === 'support' ? 'support_operations' : undefined,
                        onPress: () => navigation.navigate('AdminPool'),
                      },
                      {
                        label: ui("Activity Feed"),
                        icon: 'reader-outline',
                        tourTarget: 'support_audit',
                        onPress: () => navigation.navigate('ActivityFeed'),
                      },
                      {
                        label: ui("Support Dashboard"),
                        icon: 'analytics-outline',
                        onPress: () => navigation.navigate('AdminSupportDashboard'),
                      },
                    ]
                  : []),
                ...(profile.family === 'support' && isSuperSupport
                  ? [
                      {
                        label: ui("All Activity"),
                        icon: 'list-outline',
                        onPress: () => navigation.navigate('AllActivity'),
                      },
                    ]
                  : []),
                ...(profile.family === 'transportation'
                  ? [
                      {
                        label: ui("Transport Oversight"),
                        icon: 'speedometer-outline',
                        onPress: () =>
                          navigation.navigate(
                            profile.bookingsType === 'transportation_state'
                              ? 'AdminTransportationStateDashboard'
                              : 'ServiceBookings',
                            { type: profile.bookingsType }
                          ),
                      },
                    ]
                  : []),
                ...(profile.family === 'fumigation'
                  ? [
                      {
                        label: ui("Fumigation Oversight"),
                        icon: 'shield-checkmark-outline',
                        onPress: () =>
                          navigation.navigate(
                            user?.user_type?.includes('state')
                              ? 'AdminFumigationStateDashboard'
                              : 'ServiceBookings',
                            { type: profile.bookingsType }
                          ),
                      },
                    ]
                  : []),
              ],
            },
          ]}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default ServiceOperationsDashboardScreen;
