import React, { useEffect, useLayoutEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { legalService } from '../../services/legalService';
import { colors } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';
import {
  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const StateLawyerDashboardScreen = ({ navigation }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await legalService.getAuthorizedProperties();
      setProperties(pickList(response, ['data', 'properties']));
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

  const representedClients = new Set(
    properties
      .map((property) => property.client_email || property.client_name)
      .filter(Boolean)
  ).size;
  const coveredLocations = new Set(
    properties
      .map((property) => {
        const state = property.state_name || property.state || '';
        return [property.city, state].filter(Boolean).join(', ');
      })
      .filter(Boolean)
  ).size;

  const summaryCards = [
    { label: 'Authorized Properties', value: String(properties.length), icon: 'business-outline', color: colors.blue },
    { label: 'Represented Clients', value: String(representedClients), icon: 'people-outline', color: '#A66B00' },
    { label: 'Covered Locations', value: String(coveredLocations), icon: 'location-outline', color: colors.success },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow="STATE LAWYER"
        title="State legal oversight"
        subtitle="Review the property assignments and client matters you are authorised to access in your state."
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
