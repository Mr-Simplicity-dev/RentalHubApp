import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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

const ZonalLawyerDashboardScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await legalService.getAuthorizedProperties();
      setProperties(pickList(response, ['data', 'properties']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not load zonal lawyer dashboard'),
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
    { label: ui("Authorized Properties"), value: String(properties.length), icon: 'business-outline', color: colors.blue },
    { label: ui("Represented Clients"), value: String(representedClients), icon: 'people-outline', color: '#A66B00' },
    { label: ui("Covered Locations"), value: String(coveredLocations), icon: 'location-outline', color: colors.success },
  ];

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadDashboard}>
      <DashboardHero
        eyebrow={ui("ZONAL LAWYER")}
        title={ui("Zonal legal oversight")}
        subtitle={ui("Review the property assignments and client matters you are authorised to access across your zone.")}
        icon="scale-outline"
        onRefresh={loadDashboard}
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <DashboardSection title={ui("Legal tools")}>
        <ActionRow
          title={ui("Properties & disputes")}
          subtitle={ui("Review authorized properties and manage disputes.")}
          icon="business-outline"
          onPress={() => navigation.navigate('LawyerDashboard')}
        />
        <ActionRow
          title={ui("Verify evidence")}
          subtitle={ui("Verify case integrity and evidence authenticity.")}
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('VerifyCase')}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

export default ZonalLawyerDashboardScreen;
