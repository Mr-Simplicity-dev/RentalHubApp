import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { serviceAdminService } from '../../services/serviceAdminService';
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

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const SuperAdminTransportationDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getTransportationSuperDashboard();
      const data = pickObject(response, ['data', 'dashboard']) || {};
      setDashboard(data.national_statistics || {});
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
    loadDashboard();
  }, []);

  const totalBookings = dashboard?.total_bookings ?? dashboard?.totalBookings ?? 0;
  const completedBookings = dashboard?.completed_bookings ?? 0;
  const totalRevenue = dashboard?.total_revenue ?? dashboard?.totalRevenue ?? 0;
  const pendingBookings = dashboard?.pending_bookings ?? 0;

  const summaryCards = [
    { label: ui("Total Bookings"), value: String(totalBookings), icon: 'calendar-outline', color: colors.blue },
    { label: ui("Completed"), value: String(completedBookings), icon: 'checkmark-circle-outline', color: '#7C3AED' },
    { label: ui("Revenue"), value: formatCurrency(totalRevenue), icon: 'cash-outline', color: colors.success },
    { label: ui("Pending"), value: String(pendingBookings), icon: 'alert-circle-outline', color: '#A66B00' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow={ui("TRANSPORTATION")}
        title={ui("National transport oversight")}
        subtitle={ui("Monitor nationwide bookings, active LGAs, revenue and pending operational issues.")}
        icon="car-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid tourTarget="service_dashboard" tourLabel={ui("National service overview")}>
        {summaryCards.map((card) => (
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
                  tourTarget: 'service_bookings',
                  icon: 'car-outline',
                  onPress: () =>
                    navigation.navigate('ServiceBookings', { type: 'transportation_super' }),
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
    </DashboardScreen>
  );
};

export default SuperAdminTransportationDashboardScreen;
