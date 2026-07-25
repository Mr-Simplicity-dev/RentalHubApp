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

const AdminFumigationStateDashboardScreen = ({ navigation }) => {
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
        text2: getErrorMessage(error, 'Could not load state fumigation dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cards = [
    { label: 'Completed', value: stats.completed_bookings ?? '-', icon: 'checkmark-circle-outline', color: colors.blue },
    {
      label: 'State Compliance',
      value: stats.compliance_rate == null ? '-' : `${stats.compliance_rate}%`,
      icon: 'shield-checkmark-outline',
      color: colors.success,
    },
    { label: 'Total Bookings', value: stats.total_bookings ?? stats.totalBookings ?? '-', icon: 'calendar-outline', color: '#7C3AED' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow="STATE FUMIGATION"
        title="State fumigation oversight"
        subtitle="Oversee completed work, safety compliance and total bookings across the assigned state."
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
          subtitle="Review state-level fumigation bookings."
          icon="sparkles-outline"
          onPress={() => navigation.navigate('ServiceBookings', { type: 'fumigation' })}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default AdminFumigationStateDashboardScreen;
