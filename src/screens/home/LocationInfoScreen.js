import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import Toast from 'react-native-toast-message';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';
import {
ActionRow,
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
  const interfaceLanguage = useInterfaceLanguage();
  const { stateSlug, citySlug, areaSlug } = route?.params || {};
  const [locations, setLocations] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: navigation.canGoBack() });
  }, [navigation, interfaceLanguage]);

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
        text1: ui("Locations unavailable"),
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
  }, [locations, stateSlug, interfaceLanguage]);

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
        eyebrow={ui("LOCATION GUIDE")}
        title={locationTitle}
        subtitle={ui("Explore RentalHub coverage, property search shortcuts and popular rental areas from the app.")}
        icon="location-outline"
        onRefresh={loadLocations}
      />

      <MetricGrid>
        <MetricCard
          label={ui("States")}
          value={locations.length || '-'}
          icon="map-outline"
          color={colors.blue}
        />
        <MetricCard
          label={ui("Local areas")}
          value={lgas.length || popular.length || '-'}
          icon="navigate-outline"
          color="#7C3AED"
        />
      </MetricGrid>

      <DashboardSection title={ui("Search this location")}>
        <ActionRow
          title={ui("Browse properties in {value0}", {value0: (locationTitle)})}
          subtitle={ui("Open native property search and apply filters from there.")}
          icon="business-outline"
          onPress={() => navigation.navigate('PropertyList', {
            state: stateName,
            city: citySlug ? String(citySlug).replace(/-/g, ' ') : undefined,
            area: areaSlug ? String(areaSlug).replace(/-/g, ' ') : undefined,
          })}
        />
        <ActionRow
          title={ui("Submit property request")}
          subtitle={ui("Tell RentalHub what you want in this area.")}
          icon="megaphone-outline"
          onPress={() => navigation.navigate('PropertyAlertRequest')}
        />
      </DashboardSection>

      <DashboardSection title={selectedState ? ui("Areas in {value0}", {value0: (stateName)}) : ui("Popular locations")}>
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
                {count ? ui("{value0} listed properties", {value0: (count)}) : ui('Tap property search to browse availability')}
              </AppText>
            </View>
          );
        })}
        {!loading && !(selectedState ? lgas : popular).length ? (
          <AppText style={styles.empty}>{ui("No detailed areas are available yet.")}</AppText>
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
    fontSize: typeScale.sm,
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  locationMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
  },
});

export default LocationInfoScreen;
