import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
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

const AdminTransportationDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getTransportationDashboard();
      const data = pickObject(response, ['data']) || {};
      setStats(data.overview || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not load transportation dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cards = [
    { label: ui("Total Bookings"), value: stats.total_bookings ?? stats.totalBookings ?? '-', icon: 'calendar-outline', color: colors.blue },
    {
      label: ui("Active Trips"),
      value: Number(stats.confirmed_bookings || 0) + Number(stats.in_progress_bookings || 0),
      icon: 'car-outline',
      color: colors.success,
    },
    { label: ui("Pending"), value: stats.pending_bookings ?? '-', icon: 'time-outline', color: '#A66B00' },
    { label: ui("Revenue"), value: `₦${Number(stats.total_revenue ?? stats.totalRevenue ?? 0).toLocaleString()}`, icon: 'cash-outline', color: '#7C3AED' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow={ui("TRANSPORT OPERATIONS")}
        title={ui("Transportation desk")}
        subtitle={ui("Monitor bookings, trips, dispatches and revenue.")}
        icon="car-outline"
        onRefresh={loadStats}
      />

      <MetricGrid>
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title={ui("Mobile workspaces")}>
        <WorkspaceBoard
          collapsible
          groups={[
            {
              title: ui("Transportation"),
              icon: 'car-outline',
              items: [
                {
                  label: ui("Booking Queue"),
                  icon: 'car-outline',
                  onPress: () =>
                    navigation.navigate('ServiceBookings', { type: 'transportation' }),
                },
              ],
            },
          ]}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminTransportationDashboardScreen;
