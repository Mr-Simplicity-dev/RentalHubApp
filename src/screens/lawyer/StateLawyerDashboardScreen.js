import React, { useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import api from '../../services/api';
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

const StateLawyerDashboardScreen = ({ navigation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/lawyer/state/dashboard');
      setDashboard(pickObject(response, ['data', 'dashboard']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load lawyer dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const authorizedProperties = dashboard?.authorized_properties ?? dashboard?.authorizedProperties ?? 0;
  const activeDisputes = dashboard?.active_disputes ?? dashboard?.activeDisputes ?? 0;
  const resolvedCases = dashboard?.resolved_cases ?? dashboard?.resolvedCases ?? 0;

  const summaryCards = [
    { label: 'Authorized Properties', value: String(authorizedProperties), icon: 'business-outline', color: colors.blue },
    { label: 'Active Disputes', value: String(activeDisputes), icon: 'warning-outline', color: '#A66B00' },
    { label: 'Resolved Cases', value: String(resolvedCases), icon: 'checkmark-circle-outline', color: colors.success },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow="STATE LAWYER"
        title="State legal oversight"
        subtitle="Monitor authorized properties, active disputes and resolved cases in your state."
        icon="scale-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title="Legal tools">
        <ActionRow
          title="Properties & disputes"
          subtitle="Review authorized properties and manage disputes."
          icon="business-outline"
          onPress={() => navigation.navigate('LawyerDashboard')}
        />
        <ActionRow
          title="Verify evidence"
          subtitle="Verify case integrity and evidence authenticity."
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('VerifyCase')}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default StateLawyerDashboardScreen;
