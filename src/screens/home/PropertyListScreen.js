import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import PropertyCard from '../../components/properties/PropertyCard';
import PropertyFilters from '../../components/properties/PropertyFilters';
import { AuthContext } from '../../context/AuthContext';
import { paymentService } from '../../services/paymentService';
import { propertyService } from '../../services/propertyService';
import AdSpace from '../../components/common/AdSpace';
import { colors, radius, shadows, typography } from 
'../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

const PAGE_SIZE = 15;
const FILTER_KEYS = [
  'min_price',
  'max_price',
  'bedrooms',
  'bathrooms',
  'property_type',
  'state',
  'city',
  'payment_frequency',
];

const PropertyListScreen = ({ route, navigation }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState(route?.params?.search || '');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [locationAccessRequirement, setLocationAccessRequirement] = useState(null);
  const [locationAccessLoading, setLocationAccessLoading] = useState(false);
  const [pendingLocationAccessReference, setPendingLocationAccessReference] = useState('');
  const handledRequestRedirect = useRef(false);
  const handledLocationAccessRef = useRef('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const filters = useMemo(() => route?.params || {}, [route?.params]);
  const genericPaymentReference = route?.params?.reference || route?.params?.trxref || '';
  const locationAccessReference =
    route?.params?.location_access_ref ||
    (String(genericPaymentReference).startsWith('LOC_') ? genericPaymentReference : '');
  const activeFilterCount = FILTER_KEYS.filter(
    (key) => filters[key] !== '' && filters[key] !== null && filters[key] !== undefined
  ).length;

  useEffect(() => {
    setSearch(filters.search || '');
  }, [filters.search]);

  const loadPage = async ({ nextPage = 1, append = false, refresh = false } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const hasSearch = ['search', 'state_id', 'lga_name', ...FILTER_KEYS].some(
        (key) => filters[key] !== '' && filters[key] !== null && filters[key] !== undefined
      );
      const params = { ...filters, page: nextPage, limit: PAGE_SIZE };
      const response = hasSearch
        ? await propertyService.searchProperties(params)
        : await propertyService.browseProperties(nextPage, PAGE_SIZE);
      const list = pickList(response, ['data', 'properties']);

      setLocationAccessRequirement(null);
      setItems((previous) => (append ? [...previous, ...list] : list));
      setSavedIds((previous) => {
        const next = append ? new Set(previous) : new Set();
        list.forEach((item) => {
          if (item?.is_saved || item?.saved) next.add(item.id);
        });
        return next;
      });
      setHasMore(list.length >= PAGE_SIZE);
      setPage(nextPage);
    } catch (error) {
      const responseData = error?.response?.data;
      if (
        error?.response?.status === 402 &&
        responseData?.code === 'LOCATION_ACCESS_PAYMENT_REQUIRED'
      ) {
        setLocationAccessRequirement({
          message: responseData.message,
          ...(responseData.data || {}),
        });
        setItems([]);
        setHasMore(false);
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Could not load homes',
        text2: getErrorMessage(error, 'Check your connection and try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPage({ nextPage: 1 });
  }, [
    filters.search,
    filters.state_id,
    filters.lga_name,
    filters.city,
    filters.state,
    filters.property_type,
    filters.min_price,
    filters.max_price,
    filters.bedrooms,
    filters.bathrooms,
    filters.payment_frequency,
  ]);

  useEffect(() => {
    const isLocationReference = String(genericPaymentReference).startsWith('LOC_');
    const shouldOpenRequest =
      route?.params?.request === '1' ||
      route?.params?.request === 1 ||
      Boolean(route?.params?.alert_ref) ||
      (Boolean(genericPaymentReference) && !isLocationReference);

    if (shouldOpenRequest && !handledRequestRedirect.current) {
      handledRequestRedirect.current = true;
      navigation.navigate('PropertyAlertRequest', route?.params || {});
    }
  }, [genericPaymentReference, navigation, route?.params]);

  const completeLocationAccessPayment = async (
    reference = pendingLocationAccessReference
  ) => {
    if (!reference) return;

    setLocationAccessLoading(true);
    try {
      const response = await paymentService.verifyLocationAccess(reference);
      if (!response.success) {
        throw new Error(response.message || 'Verification failed');
      }

      setLocationAccessRequirement(null);
      setPendingLocationAccessReference('');
      navigation.setParams({
        location_access_ref: undefined,
        reference: undefined,
        trxref: undefined,
      });
      await loadPage({ nextPage: 1 });
      Toast.show({
        type: 'success',
        text1: 'Location unlocked',
        text2: response.message || 'You can now browse homes in this location.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: getErrorMessage(error, 'Could not verify location access payment'),
      });
    } finally {
      setLocationAccessLoading(false);
    }
  };

  useEffect(() => {
    if (
      locationAccessReference &&
      handledLocationAccessRef.current !== locationAccessReference
    ) {
      handledLocationAccessRef.current = locationAccessReference;
      completeLocationAccessPayment(locationAccessReference);
    }
  }, [locationAccessReference]);

  const handleLocationAccessPayment = async () => {
    const location = locationAccessRequirement?.location;
    if (!location?.state_id) {
      Toast.show({
        type: 'error',
        text1: 'Invalid location',
        text2: 'Select a valid location before paying.',
      });
      return;
    }

    setLocationAccessLoading(true);
    try {
      const response = await paymentService.initializeLocationAccess({
        state_id: location.state_id,
        lga_name: location.lga_name || undefined,
      });

      if (response.payment_required === false) {
        setLocationAccessRequirement(null);
        await loadPage({ nextPage: 1 });
        Toast.show({
          type: 'success',
          text1: 'Access active',
          text2: response.message || 'You already have access to this location.',
        });
        return;
      }

      const authorizationUrl = response?.data?.authorization_url;
      const reference = response?.data?.reference;
      if (reference) setPendingLocationAccessReference(reference);

      if (authorizationUrl) {
        await Linking.openURL(authorizationUrl);
        Toast.show({
          type: 'success',
          text1: 'Payment started',
          text2: 'Complete payment in your browser, then return here to confirm.',
        });
        return;
      }

      throw new Error(response.message || 'Could not start location access payment.');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Payment failed',
        text2: getErrorMessage(error, 'Could not start location access payment'),
      });
    } finally {
      setLocationAccessLoading(false);
    }
  };

  const submitSearch = () => {
    navigation.setParams({ search: search.trim() || undefined });
  };

  const applyFilters = (nextFilters) => {
    const cleared = Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined]));
    navigation.setParams({ ...cleared, ...nextFilters });
    setFiltersVisible(false);
  };

  const toggleSave = async (id) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }

    const isSaved = savedIds.has(id);
    setSavingId(id);
    try {
      if (isSaved) {
        await propertyService.unsaveProperty(id);
      } else {
        await propertyService.saveProperty(id);
      }
      setSavedIds((previous) => {
        const next = new Set(previous);
        isSaved ? next.delete(id) : next.add(id);
        return next;
      });
      Toast.show({
        type: 'success',
        text1: isSaved ? 'Removed from saved homes' : 'Home saved',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not update saved homes',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setSavingId(null);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading && !locationAccessRequirement) {
      loadPage({ nextPage: page + 1, append: true });
    }
  };

  const locationLabel = locationAccessRequirement?.location
    ? [
        locationAccessRequirement.location.lga_name,
        locationAccessRequirement.location.state_name,
      ]
        .filter(Boolean)
        .join(', ')
    : 'this location';
  const homeLocationLabel = locationAccessRequirement?.home_location
    ? [
        locationAccessRequirement.home_location.lga_name,
        locationAccessRequirement.home_location.state_name,
      ]
        .filter(Boolean)
        .join(', ')
    : '';
  const accessFeeLabel = `₦${Number(
    locationAccessRequirement?.amount || 10000
  ).toLocaleString()}`;

  const listHeader = (
    <>
      {locationAccessRequirement ? (
        <View style={styles.accessCard}>
          <View style={styles.accessIcon}>
            <Icon name="location" size={20} color={colors.gold} />
          </View>
          <Text style={styles.accessEyebrow}>LOCATION ACCESS</Text>
          <Text style={styles.accessTitle}>
            Unlock homes in {locationLabel}
          </Text>
          <Text style={styles.accessText}>
            {locationAccessRequirement.message ||
              'Pay once to browse verified homes outside your registered location.'}
          </Text>
          {homeLocationLabel ? (
            <Text style={styles.accessMeta}>Your registered area: {homeLocationLabel}</Text>
          ) : null}
          {locationAccessRequirement.access_days ? (
            <Text style={styles.accessMeta}>
              Access remains active for {locationAccessRequirement.access_days} days.
            </Text>
          ) : null}
          <TouchableOpacity
            disabled={locationAccessLoading}
            onPress={
              pendingLocationAccessReference
                ? () => completeLocationAccessPayment()
                : handleLocationAccessPayment
            }
            style={[styles.accessButton, locationAccessLoading && styles.disabled]}>
            {locationAccessLoading ? (
              <ActivityIndicator color={colors.navy} size="small" />
            ) : (
              <>
                <Text style={styles.accessButtonText}>
                  {pendingLocationAccessReference
                    ? 'Confirm payment'
                    : `Unlock for ${accessFeeLabel}`}
                </Text>
                <Icon name="arrow-forward" size={18} color={colors.navy} />
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {!locationAccessRequirement && !loading ? (
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>
            {items.length ? `${items.length}${hasMore ? '+' : ''} homes found` : 'No homes found'}
          </Text>
          {activeFilterCount ? (
            <Text style={styles.filterSummary}>{activeFilterCount} filters active</Text>
          ) : null}
        </View>
      ) : null}

      <AdSpace placement="properties_inline" />

    </>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}>
            <Icon name="arrow-back" size={22} color={colors.navy} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>EXPLORE</Text>
            <Text style={styles.title}>Verified homes</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Create property request"
            onPress={() =>
              navigation.navigate('PropertyAlertRequest', {
                search: filters.search,
                state_id: filters.state_id,
                city: filters.city,
                property_type: filters.property_type,
              })
            }
            style={styles.iconButton}>
            <Icon name="notifications-outline" size={21} color={colors.navy} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Icon name="search-outline" size={20} color={colors.muted} />
            <TextInput
              onChangeText={setSearch}
              onSubmitEditing={submitSearch}
              placeholder="Search an area or city"
              placeholderTextColor="#96A2B8"
              returnKeyType="search"
              selectionColor={colors.blue}
              style={styles.searchInput}
              value={search}
            />
            {search ? (
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  navigation.setParams({ search: undefined });
                }}>
                <Icon name="close-circle" size={19} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            accessibilityLabel="Open filters"
            onPress={() => setFiltersVisible(true)}
            style={[styles.filterButton, activeFilterCount && styles.filterButtonActive]}>
            <Icon
              name="options-outline"
              size={21}
              color={activeFilterCount ? colors.white : colors.navy}
            />
            {activeFilterCount ? (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        contentContainerStyle={[
          styles.list,
          !items.length && !locationAccessRequirement && styles.emptyList,
        ]}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.blue} size="large" />
              <Text style={styles.loadingText}>Finding the right homes…</Text>
            </View>
          ) : !locationAccessRequirement ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="search-outline" size={30} color={colors.blue} />
              </View>
              <Text style={styles.emptyTitle}>No matching homes yet</Text>
              <Text style={styles.emptyText}>
                Adjust your filters or create a request and we’ll notify you when one arrives.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('PropertyAlertRequest', filters)}
                style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>Create property request</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.blue} size="small" />
            </View>
          ) : !hasMore && items.length ? (
            <View style={styles.endRow}>
              <View style={styles.endLine} />
              <Text style={styles.endText}>You’ve seen every home</Text>
              <View style={styles.endLine} />
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadPage({ nextPage: 1, refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            isSaved={savedIds.has(item.id)}
            onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
            onSave={savingId === item.id ? undefined : toggleSave}
            property={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <PropertyFilters
        initialFilters={filters}
        onApply={applyFilters}
        onClose={() => setFiltersVisible(false)}
        visible={filtersVisible}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: 15,
    paddingHorizontal: 18,
    paddingTop: 7,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: {
    alignItems: 'center',
    flex: 1,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  searchField: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
    paddingHorizontal: 10,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  filterButtonActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  filterCount: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    top: -5,
    width: 18,
  },
  filterCountText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 9,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  resultText: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  filterSummary: {
    color: colors.blue,
    fontFamily: typography.medium,
    fontSize: 11,
  },
  accessCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginBottom: 18,
    overflow: 'hidden',
    padding: 20,
  },
  accessIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,201,40,0.14)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  accessEyebrow: {
    color: '#9BC3F4',
    fontFamily: typography.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 17,
  },
  accessTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 21,
    letterSpacing: -0.4,
    marginTop: 5,
  },
  accessText: {
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  accessMeta: {
    color: '#8FA8CA',
    fontFamily: typography.medium,
    fontSize: 11,
    marginTop: 6,
  },
  accessButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  accessButtonText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 330,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 380,
    paddingHorizontal: 25,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 17,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAction: {
    borderColor: colors.blue,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: 19,
    paddingHorizontal: 17,
    paddingVertical: 11,
  },
  emptyActionText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  footer: {
    paddingVertical: 15,
  },
  endRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 17,
  },
  endLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  endText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 10,
  },
});

export default PropertyListScreen;
