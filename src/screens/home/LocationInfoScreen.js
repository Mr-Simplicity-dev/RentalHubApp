import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {ActivityIndicator, StyleSheet View} from 'react-native';
import Toast from 'react-native-toast-message';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import {

import AppText from '../../components/common/AppText';  ActionRow,
  DashboardHero,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';

const normalizeSlug = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const LocationInfoScreen = ({ navigation, route }) => {
  const { stateSlug, citySlug, areaSlug } = route?.params || {};
  const [locations, setLocations] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const [optionsRes, popularRes] = await Promise.all([
        propertyService.getLocationOptions(),
        propertyService.getPopularLocations(12),
      ]);
      setLocations(pickList(optionsRes, ['data', 'locations']));
      setPopular(pickList(popularRes, ['data', 'locations']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Locations unavailable',
        text2: getErrorMessage(error, 'Could not load location information'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const selectedState = useMemo(() => {
    if (!stateSlug) return null;
    return locations.find((state) =>
      normalizeSlug(state.slug || state.state_name || state.name) === normalizeSlug(stateSlug)
    );
  }, [locations, stateSlug]);

  const stateName = selectedState?.state_name || selectedState?.name || stateSlug || 'Nigeria';
  const lgas = selectedState?.lgas || selectedState?.cities || [];
  const locationTitle = areaSlug
    ? `${String(areaSlug).replace(/-/g, ' ')}, ${String(citySlug || '').replace(/-/g, ' ')}`
    : citySlug
      ? `${String(citySlug).replace(/-/g, ' ')}, ${stateName}`
      : stateName;

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadLocations}>
      <DashboardHero
        eyebrow="LOCATION GUIDE"
        title={locationTitle}
        subtitle="Explore RentalHub coverage, property search shortcuts and popular rental areas from the app."
        icon="location-outline"
        onRefresh={loadLocations}
      />

      <MetricGrid>
        <MetricCard
          label="States"
          value={locations.length || '-'}
          icon="map-outline"
          color={colors.blue}
        />
        <MetricCard
          label="Local areas"
          value={lgas.length || popular.length || '-'}
          icon="navigate-outline"
          color="#7C3AED"
        />
      </MetricGrid>

      <DashboardSection title="Search this location">
        <ActionRow
          title={`Browse properties in ${locationTitle}`}
          subtitle="Open native property search and apply filters from there."
          icon="business-outline"
          onPress={() => navigation.navigate('PropertyList', {
            state: stateName,
            city: citySlug ? String(citySlug).replace(/-/g, ' ') : undefined,
            area: areaSlug ? String(areaSlug).replace(/-/g, ' ') : undefined,
          })}
        />
        <ActionRow
          title="Submit property request"
          subtitle="Tell RentalHub what you want in this area."
          icon="megaphone-outline"
          onPress={() => navigation.navigate('PropertyAlertRequest')}
        />
      </DashboardSection>

      <DashboardSection title={selectedState ? `Areas in ${stateName}` : 'Popular locations'}>
        {loading && !locations.length ? <ActivityIndicator color={colors.blue} /> : null}
        {(selectedState ? lgas : popular).slice(0, 12).map((item, index) => {
          const label =
            item.lga_name ||
            item.city ||
            item.name ||
            item.state_name ||
            item.location ||
            `Location ${index + 1}`;
          const count = item.property_count || item.count || item.total_properties;

          return (
            <View key={`${label}-${index}`} style={styles.locationCard}>
              <AppText style={styles.locationName}>{label}</AppText>
              <AppText style={styles.locationMeta}>
                {count ? `${count} listed properties` : 'Tap property search to browse availability'}
              </AppText>
            </View>
          );
        })}
        {!loading && !(selectedState ? lgas : popular).length ? (
          <AppText style={styles.empty}>No detailed areas are available yet.</AppText>
        ) : null}
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  locationCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  locationName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  locationMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
  },
});

export default LocationInfoScreen;
