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

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const SuperAdminTransportationDashboardScreen = ({ navigation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getTransportationSuperDashboard();
      setDashboard(pickObject(response, ['data', 'dashboard']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
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
  const activeLgas = dashboard?.active_lgas ?? dashboard?.activeLgas ?? 0;
  const totalRevenue = dashboard?.total_revenue ?? dashboard?.totalRevenue ?? 0;
  const pendingIssues = dashboard?.pending_issues ?? dashboard?.pendingIssues ?? 0;

  const summaryCards = [
    { label: 'Total Bookings', value: String(totalBookings), icon: 'calendar-outline', color: colors.blue },
    { label: 'Active LGAs', value: String(activeLgas), icon: 'map-outline', color: '#7C3AED' },
    { label: 'Revenue', value: formatCurrency(totalRevenue), icon: 'cash-outline', color: colors.success },
    { label: 'Pending Issues', value: String(pendingIssues), icon: 'alert-circle-outline', color: '#A66B00' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow="TRANSPORTATION"
        title="National transport oversight"
        subtitle="Monitor nationwide bookings, active LGAs, revenue and pending operational issues."
        icon="car-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title="Mobile workspaces">
        <ActionRow
          title="Booking queue"
          subtitle="Review recent transportation bookings across all LGAs."
          icon="car-outline"
          onPress={() => navigation.navigate('ServiceBookings', { type: 'transportation_super' })}
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
      </DashboardSection>
    </DashboardScreen>
  );
};

export default SuperAdminTransportationDashboardScreen;
