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

const AdminFumigationDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getFumigationStats();
      setStats(pickObject(response, ['data', 'stats']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load fumigation dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cards = [
    { label: 'Pending Bookings', value: stats.pending_bookings ?? stats.pendingBookings ?? '-', icon: 'time-outline', color: '#A66B00' },
    { label: 'Completed', value: stats.completed_bookings ?? stats.completedBookings ?? '-', icon: 'checkmark-circle-outline', color: colors.success },
    {
      label: 'Compliance Rate',
      value: stats.compliance_rate == null ? '-' : `${stats.compliance_rate}%`,
      icon: 'shield-checkmark-outline',
      color: colors.blue,
    },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow="FUMIGATION & CLEANING"
        title="Fumigation oversight"
        subtitle="Monitor bookings, completions and safety compliance."
        icon="sparkles-outline"
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
          subtitle="Review and manage fumigation bookings."
          icon="sparkles-outline"
          onPress={() => navigation.navigate('ServiceBookings', { type: 'fumigation' })}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminFumigationDashboardScreen;
