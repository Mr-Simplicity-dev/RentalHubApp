import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AdSpace from '../../components/common/AdSpace';
import BrandMark from '../../components/brand/BrandMark';
import PropertyCard from '../../components/properties/PropertyCard';
import { AuthContext } from '../../context/AuthContext';
import { propertyService } from '../../services/propertyService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
const propertyTypes = [
  { label: 'Apartment', value: 'apartment', icon: 'business-outline' },
  { label: 'House', value: 'house', icon: 'home-outline' },
  { label: 'Duplex', value: 'duplex', icon: 'layers-outline' },
  { label: 'Short let', value: 'short_let', icon: 'bed-outline' },
];

const HomeScreen = ({ navigation }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [locations, setLocations] = useState([]);

  const featuredCards = useMemo(() => featured.slice(0, 6), [featured]);
  const firstName = String(user?.full_name || user?.name || '').trim().split(/\s+/)[0];

  const loadHome = async ({ refresh = false } = {}) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [featuredRes, statesRes] = await Promise.all([
        propertyService.getFeaturedProperties(8),
        propertyService.getStates(),
      ]);
      setFeatured(pickList(featuredRes, ['data', 'properties']));
      setLocations(pickList(statesRes, ['data', 'states']).slice(0, 8));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not refresh Explore',
        text2: getErrorMessage(error, 'Please check your connection and try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  const goToPropertyList = (params = {}) => {
    navigation.navigate('PropertyList', params);
  };

  const submitSearch = () => {
    const value = search.trim();
    goToPropertyList(value ? { search: value } : {});
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHome({ refresh: true })}
            colors={[colors.blue]}
            tintColor={colors.blue}
          />
        }>
        <View style={styles.topBar}>
          <BrandMark compact />
          <TouchableOpacity
            accessibilityLabel={isAuthenticated ? 'Open notifications' : 'Sign in'}
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate(isAuthenticated ? 'Notifications' : 'Login')
            }
            style={styles.topAction}>
            <Icon
              name={isAuthenticated ? 'notifications-outline' : 'person-outline'}
              size={21}
              color={colors.navy}
            />
            {isAuthenticated ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
        </View>

        <View style={styles.intro}>
          {firstName ? <AppText style={styles.greeting}>Hello, {firstName}</AppText> : null}
          <AppText style={styles.title}>Find a place that{'\n'}feels like yours.</AppText>
          <AppText style={styles.subtitle}>
            Search verified homes and move with confidence.
          </AppText>
        </View>

        <View style={styles.searchCard}>
          <Icon name="search-outline" size={21} color={colors.muted} />
          <TextInput
            accessibilityLabel="Search properties"
            value={search}
            onChangeText={setSearch}
            placeholder="City, state or neighbourhood"
            placeholderTextColor="#909CB2"
            style={styles.searchInput}
            returnKeyType="search"
            selectionColor={colors.blue}
            onSubmitEditing={submitSearch}
          />
          <TouchableOpacity
            accessibilityLabel="Search"
            accessibilityRole="button"
            onPress={submitSearch}
            style={styles.searchButton}>
            <Icon name="arrow-forward" size={19} color={colors.white} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.typeRow}
          showsHorizontalScrollIndicator={false}>
          {propertyTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              activeOpacity={0.8}
              onPress={() => goToPropertyList({ property_type: type.value })}
              style={styles.typeChip}>
              <View style={styles.typeIcon}>
                <Icon name={type.icon} size={18} color={colors.blue} />
              </View>
              <AppText style={styles.typeText}>{type.label}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <AppText style={styles.sectionEyebrow}>CURATED FOR YOU</AppText>
            <AppText style={styles.sectionTitle}>Featured homes</AppText>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => goToPropertyList()}
            style={styles.seeAllButton}>
            <AppText style={styles.seeAllText}>See all</AppText>
            <Icon name="chevron-forward" size={16} color={colors.blue} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.blue} />
            <AppText style={styles.loadingText}>Finding verified homes…</AppText>
          </View>
        ) : featuredCards.length ? (
          <ScrollView
            horizontal
            contentContainerStyle={styles.featuredRow}
            decelerationRate="fast"
            snapToInterval={312}
            showsHorizontalScrollIndicator={false}>
            {featuredCards.map((item) => (
              <View key={item.id} style={styles.featuredCard}>
                <PropertyCard
                  property={item}
                  onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="home-outline" size={25} color={colors.blue} />
            <View style={styles.emptyCopy}>
              <AppText style={styles.emptyTitle}>Fresh listings are on the way</AppText>
              <AppText style={styles.emptyText}>Browse all available properties for now.</AppText>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <AppText style={styles.sectionEyebrow}>EXPLORE NIGERIA</AppText>
            <AppText style={styles.sectionTitle}>Popular locations</AppText>
          </View>
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.locationRow}
          showsHorizontalScrollIndicator={false}>
          {locations.map((item, index) => (
            <TouchableOpacity
              key={item.id || item.state_name}
              activeOpacity={0.82}
              onPress={() => goToPropertyList({ state_id: item.id })}
              style={[styles.locationCard, index % 2 === 1 && styles.locationCardAlt]}>
              <View style={styles.locationIcon}>
                <Icon name="location" size={18} color={colors.white} />
              </View>
              <AppText style={styles.locationName} numberOfLines={1}>
                {item.state_name || item.name}
              </AppText>
              <AppText style={styles.locationMeta}>
                {Number(item.property_count || 0).toLocaleString()} homes
              </AppText>
              <Icon
                name="arrow-forward-circle-outline"
                size={23}
                color="rgba(255,255,255,0.78)"
                style={styles.locationArrow}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.sectionEyebrow}>SPONSORED</AppText>
            <AppText style={styles.sectionTitle}>Featured offers</AppText>
          </View>
        </View>
        <View style={styles.adSection}>
          <AdSpace placement="home_featured" />
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.requestCard}
          onPress={() => navigation.navigate('PropertyAlertRequest')}>
          <View style={styles.requestWatermark}>
            <Icon name="search" size={112} color="rgba(255,255,255,0.05)" />
          </View>
          <View style={styles.requestIcon}>
            <Icon name="sparkles" size={20} color={colors.gold} />
          </View>
          <AppText style={styles.requestTitle}>Can’t find the right home?</AppText>
          <AppText style={styles.requestText}>
            Tell us what you need and we’ll alert you when a matching property arrives.
          </AppText>
          <View style={styles.requestAction}>
            <AppText style={styles.requestActionText}>Create property request</AppText>
            <Icon name="arrow-forward" size={18} color={colors.navy} />
          </View>
        </TouchableOpacity>

        <View style={styles.trustLine}>
          <Icon name="shield-checkmark" size={16} color={colors.success} />
          <AppText style={styles.trustText}>Listings reviewed for a safer rental journey</AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  content: {
    paddingBottom: 34,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 9,
  },
  topAction: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  notificationDot: {
    backgroundColor: colors.gold,
    borderColor: colors.white,
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 7,
    top: 7,
    width: 10,
  },
  intro: {
    paddingHorizontal: 20,
    paddingTop: 35,
  },
  greeting: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginBottom: 7,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 36,
    letterSpacing: -1.25,
    lineHeight: 42,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
  },
  searchCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E6EBF3',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 25,
    minHeight: 58,
    paddingLeft: 16,
    paddingRight: 9,
    ...shadows.soft,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
    paddingHorizontal: 11,
    paddingVertical: 15,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  typeRow: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 17,
  },
  typeChip: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  typeIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  typeText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginHorizontal: 9,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginHorizontal: 20,
    marginTop: 34,
  },
  sectionEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    marginTop: 5,
  },
  seeAllButton: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 2,
    paddingLeft: 12,
    paddingVertical: 6,
  },
  seeAllText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginHorizontal: 20,
    minHeight: 180,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 12,
  },
  featuredRow: {
    gap: 12,
    paddingHorizontal: 20,
  },
  featuredCard: {
    width: 300,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 18,
  },
  emptyCopy: {
    flex: 1,
    marginLeft: 13,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  locationRow: {
    gap: 12,
    paddingHorizontal: 20,
  },
  locationCard: {
    backgroundColor: colors.navySoft,
    borderRadius: radius.md,
    minHeight: 145,
    overflow: 'hidden',
    padding: 16,
    width: 156,
  },
  locationCardAlt: {
    backgroundColor: '#164FA4',
  },
  locationIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  locationName: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 18,
    marginTop: 15,
  },
  locationMeta: {
    color: '#B6C9E6',
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 4,
  },
  locationArrow: {
    bottom: 13,
    position: 'absolute',
    right: 13,
  },
  adSection: {
    marginHorizontal: 20,
  },
  requestCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginHorizontal: 20,
    marginTop: 35,
    overflow: 'hidden',
    padding: 21,
  },
  requestWatermark: {
    position: 'absolute',
    right: -18,
    top: -15,
  },
  requestIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,201,40,0.14)',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  requestTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 20,
    letterSpacing: -0.5,
    marginTop: 18,
  },
  requestText: {
    color: '#AFC2DF',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 300,
  },
  requestAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  requestActionText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 13,
    marginRight: 9,
  },
  trustLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
  },
  trustText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginLeft: 7,
  },
});

export default HomeScreen;
