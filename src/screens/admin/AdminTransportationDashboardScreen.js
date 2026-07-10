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

const AdminTransportationDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getTransportationDashboard();
      setStats(pickObject(response, ['data']));
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
    loadStats();
  }, []);

  const cards = [
    { label: 'Total Bookings', value: stats.total_bookings ?? stats.totalBookings ?? '-', icon: 'calendar-outline', color: colors.blue },
    { label: 'Active Trips', value: stats.active_trips ?? stats.activeTrips ?? '-', icon: 'car-outline', color: colors.success },
    { label: 'Pending Dispatches', value: stats.pending_dispatches ?? stats.pendingDispatches ?? '-', icon: 'time-outline', color: '#A66B00' },
    { label: 'Revenue', value: `₦${Number(stats.total_revenue ?? stats.totalRevenue ?? 0).toLocaleString()}`, icon: 'cash-outline', color: '#7C3AED' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow="TRANSPORT OPERATIONS"
        title="Transportation desk"
        subtitle="Monitor bookings, trips, dispatches and revenue."
        icon="car-outline"
        onRefresh={loadStats}
      />

      <MetricGrid>
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title="Mobile workspaces">
        <ActionRow
          title="Booking queue"
          subtitle="Review and manage transportation bookings."
          icon="car-outline"
          onPress={() => navigation.navigate('ServiceBookings', { type: 'transportation' })}
        />
        <ActionRow
          title="Fumigation compliance"
          subtitle="Review safety compliance records."
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('FumigationCompliance')}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminTransportationDashboardScreen;
