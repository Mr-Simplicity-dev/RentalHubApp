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
      const data = pickObject(response, ['data', 'dashboard']) || {};
      setDashboard(data.national_statistics || {});
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
  const completedBookings = dashboard?.completed_bookings ?? 0;
  const totalRevenue = dashboard?.total_revenue ?? dashboard?.totalRevenue ?? 0;
  const pendingBookings = dashboard?.pending_bookings ?? 0;

  const summaryCards = [
    { label: 'Total Bookings', value: String(totalBookings), icon: 'calendar-outline', color: colors.blue },
    { label: 'Completed', value: String(completedBookings), icon: 'checkmark-circle-outline', color: '#7C3AED' },
    { label: 'Revenue', value: formatCurrency(totalRevenue), icon: 'cash-outline', color: colors.success },
    { label: 'Pending', value: String(pendingBookings), icon: 'alert-circle-outline', color: '#A66B00' },
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
