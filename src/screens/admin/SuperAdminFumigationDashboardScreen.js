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

const SuperAdminFumigationDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getFumigationStats();
      setStats(pickObject(response, ['data', 'stats']) || {});
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

  const totalBookings = stats?.total_bookings ?? stats?.totalBookings ?? 0;
  const compliancePercent = stats?.compliance_percent ?? stats?.compliancePercent ?? '-';
  const activeProviders = stats?.active_providers ?? stats?.activeProviders ?? 0;

  const summaryCards = [
    { label: 'Nationwide Bookings', value: String(totalBookings), icon: 'calendar-outline', color: colors.blue },
    { label: 'Compliance %', value: String(compliancePercent), icon: 'shield-checkmark-outline', color: colors.success },
    { label: 'Active Providers', value: String(activeProviders), icon: 'people-outline', color: '#7C3AED' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow="FUMIGATION"
        title="National fumigation oversight"
        subtitle="Monitor nationwide bookings, provider compliance and active service providers."
        icon="sparkles-outline"
        onRefresh={loadStats}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title="Mobile workspaces">
        <ActionRow
          title="Booking queue"
          subtitle="Review recent fumigation and cleaning bookings."
          icon="sparkles-outline"
          onPress={() => navigation.navigate('ServiceBookings', { type: 'fumigation' })}
        />
        <ActionRow
          title="Compliance records"
          subtitle="Review safety compliance and provider records."
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('FumigationCompliance')}
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

export default SuperAdminFumigationDashboardScreen;
