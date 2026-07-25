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

const AdminTransportationStateDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getTransportationStateDashboard();
      const data = pickObject(response, ['data']) || {};
      setStats(data.statistics || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load state transportation dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cards = [
    { label: 'Total Bookings', value: stats.total_bookings ?? '-', icon: 'business-outline', color: colors.blue },
    { label: 'State Revenue', value: `₦${Number(stats.total_revenue ?? 0).toLocaleString()}`, icon: 'cash-outline', color: colors.success },
    { label: 'Services Used', value: stats.services_used ?? '-', icon: 'navigate-outline', color: '#7C3AED' },
    { label: 'Pending', value: stats.pending_bookings ?? '-', icon: 'time-outline', color: '#A66B00' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow="STATE TRANSPORTATION"
        title="Transport oversight"
        subtitle="Oversee LGA transportation bookings, revenue and active routes."
        icon="car-sport-outline"
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
          subtitle="Review state-level transportation bookings."
          icon="car-sport-outline"
          onPress={() => navigation.navigate('ServiceBookings', { type: 'transportation_state' })}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminTransportationStateDashboardScreen;
