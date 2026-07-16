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

const SuperLawyerDashboardScreen = ({ navigation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/lawyer/super/dashboard');
      setDashboard(pickObject(response, ['data', 'dashboard']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load super lawyer dashboard'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const nationwideCases = dashboard?.nationwide_cases ?? dashboard?.nationwideCases ?? 0;
  const stateReports = dashboard?.state_reports ?? dashboard?.stateReports ?? 0;
  const pendingReviews = dashboard?.pending_reviews ?? dashboard?.pendingReviews ?? 0;

  const summaryCards = [
    { label: 'Nationwide Cases', value: String(nationwideCases), icon: 'globe-outline', color: colors.blue },
    { label: 'State Reports', value: String(stateReports), icon: 'document-text-outline', color: '#7C3AED' },
    { label: 'Pending Reviews', value: String(pendingReviews), icon: 'time-outline', color: '#A66B00' },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow="SUPER LAWYER"
        title="National legal oversight"
        subtitle="Oversee nationwide cases, state reports and pending legal reviews."
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
          subtitle="Review authorized properties and manage disputes across all states."
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

export default SuperLawyerDashboardScreen;
