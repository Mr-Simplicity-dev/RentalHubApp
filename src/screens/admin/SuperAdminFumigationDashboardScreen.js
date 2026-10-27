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

const SuperAdminFumigationDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await serviceAdminService.getFumigationStats();
      setStats(pickObject(response, ['data', 'stats']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
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
  const compliancePercent = stats?.compliance_rate;
  const activeProviders = stats?.active_providers ?? stats?.activeProviders ?? 0;

  const summaryCards = [
    { label: ui("Nationwide Bookings"), value: String(totalBookings), icon: 'calendar-outline', color: colors.blue },
    {
      label: ui("Compliance %"),
      value: compliancePercent == null ? '-' : `${compliancePercent}%`,
      icon: 'shield-checkmark-outline',
      color: colors.success,
    },
    { label: ui("Active Providers"), value: String(activeProviders), icon: 'people-outline', color: '#7C3AED' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadStats}>
      <DashboardHero
        eyebrow={ui("FUMIGATION")}
        title={ui("National fumigation oversight")}
        subtitle={ui("Monitor nationwide bookings, provider compliance and active service providers.")}
        icon="sparkles-outline"
        onRefresh={loadStats}
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
              title: ui("Fumigation & Cleaning"),
              icon: 'sparkles-outline',
              items: [
                {
                  label: ui("Booking Queue"),
                  tourTarget: 'service_bookings',
                  icon: 'sparkles-outline',
                  onPress: () =>
                    navigation.navigate('ServiceBookings', { type: 'fumigation' }),
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

export default SuperAdminFumigationDashboardScreen;
