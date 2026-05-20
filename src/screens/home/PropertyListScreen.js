import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Toast from 'react-native-toast-message';
import PropertyCard from '../../components/properties/PropertyCard';
import { propertyService } from '../../services/propertyService';
import { paymentService } from '../../services/paymentService';
import { getErrorMessage, pickList } from '../../utils/http';

const PAGE_SIZE = 15;

const PropertyListScreen = ({ route, navigation }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [locationAccessRequirement, setLocationAccessRequirement] = useState(null);
  const [locationAccessLoading, setLocationAccessLoading] = useState(false);
  const [pendingLocationAccessReference, setPendingLocationAccessReference] = useState('');
  const handledRequestRedirect = useRef(false);
  const handledLocationAccessRef = useRef('');

  const filters = useMemo(() => route?.params || {}, [route?.params]);
  const genericPaymentReference =
    route?.params?.reference || route?.params?.trxref || '';
  const locationAccessReference =
    route?.params?.location_access_ref ||
    (String(genericPaymentReference).startsWith('LOC_') ? genericPaymentReference : '');

  const loadPage = async ({ nextPage = 1, append = false } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const hasSearch =
        Boolean(filters.search) ||
        Boolean(filters.state_id) ||
        Boolean(filters.lga_name) ||
        Boolean(filters.city) ||
        Boolean(filters.property_type);

      const params = { ...filters, page: nextPage, limit: PAGE_SIZE };

      const response = hasSearch
        ? await propertyService.searchProperties(params)
        : await propertyService.browseProperties(nextPage, PAGE_SIZE);

      const list = pickList(response, ['data', 'properties']);
      setLocationAccessRequirement(null);
      setItems((prev) => (append ? [...prev, ...list] : list));
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
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load properties'),
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPage({ nextPage: 1, append: false });
  }, [filters.search, filters.state_id, filters.lga_name, filters.city, filters.property_type]);

  useEffect(() => {
    const shouldOpenRequest =
      route?.params?.request === '1' ||
      route?.params?.request === 1 ||
      Boolean(route?.params?.alert_ref || route?.params?.reference || route?.params?.trxref);

    if (shouldOpenRequest && !handledRequestRedirect.current) {
      handledRequestRedirect.current = true;
      navigation.navigate('PropertyAlertRequest', route?.params || {});
    }
  }, [navigation, route?.params]);

  const completeLocationAccessPayment = async (reference = pendingLocationAccessReference) => {
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
      await loadPage({ nextPage: 1, append: false });
      Toast.show({
        type: 'success',
        text1: 'Access activated',
        text2: response.message || 'You can now browse this location.',
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
        await loadPage({ nextPage: 1, append: false });
        Toast.show({
          type: 'success',
          text1: 'Access active',
          text2: response.message || 'You already have access to this location.',
        });
        return;
      }

      const authorizationUrl = response?.data?.authorization_url;
      const reference = response?.data?.reference;

      if (reference) {
        setPendingLocationAccessReference(reference);
      }

      if (authorizationUrl) {
        await Linking.openURL(authorizationUrl);
        Toast.show({
          type: 'success',
          text1: 'Payment started',
          text2: 'Complete payment in browser, then return here to confirm access.',
        });
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Payment unavailable',
        text2: response.message || 'Could not start location access payment.',
      });
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

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadPage({ nextPage: page + 1, append: true });
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#0284c7" />
      </View>
    );
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
  const accessFeeLabel = `N${Number(
    locationAccessRequirement?.amount || 10000
  ).toLocaleString()}`;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse Properties</Text>
        <Text style={styles.subtitle}>{items.length} properties loaded</Text>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() =>
            navigation.navigate('PropertyAlertRequest', {
              search: filters.search,
              state_id: filters.state_id,
              city: filters.city,
              property_type: filters.property_type,
            })
          }
        >
          <Text style={styles.requestButtonText}>Submit property request</Text>
        </TouchableOpacity>
      </View>

      {locationAccessRequirement ? (
        <View style={styles.accessCard}>
          <Text style={styles.accessEyebrow}>Location access required</Text>
          <Text style={styles.accessTitle}>
            Pay {accessFeeLabel} to browse {locationLabel}
          </Text>
          <Text style={styles.accessText}>
            {locationAccessRequirement.message ||
              'Your tenant account can browse properties in your registered state and LGA. Pay once to unlock this selected location.'}
          </Text>
          {homeLocationLabel ? (
            <Text style={styles.accessMeta}>
              Registered location: {homeLocationLabel}
            </Text>
          ) : null}
          {locationAccessRequirement.access_days ? (
            <Text style={styles.accessMeta}>
              Access lasts for {locationAccessRequirement.access_days} days after payment.
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.accessButton,
              locationAccessLoading ? styles.disabledButton : null,
            ]}
            disabled={locationAccessLoading}
            onPress={
              pendingLocationAccessReference
                ? () => completeLocationAccessPayment()
                : handleLocationAccessPayment
            }
          >
            <Text style={styles.accessButtonText}>
              {locationAccessLoading
                ? 'Processing...'
                : pendingLocationAccessReference
                ? 'Confirm Payment'
                : `Pay ${accessFeeLabel}`}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No properties found.</Text>
          </View>
        }
      />

      {!hasMore && items.length > 0 && (
        <TouchableOpacity style={styles.endBadge}>
          <Text style={styles.endBadgeText}>You reached the end</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 4,
    color: '#64748b',
  },
  requestButton: {
    marginTop: 10,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  requestButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  accessCard: {
    margin: 14,
    marginBottom: 0,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
  },
  accessEyebrow: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  accessTitle: {
    marginTop: 4,
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  accessText: {
    marginTop: 8,
    color: '#374151',
    fontSize: 13,
    lineHeight: 19,
  },
  accessMeta: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  accessButton: {
    marginTop: 12,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  accessButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.65,
  },
  list: { padding: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#64748b', fontSize: 15 },
  footer: { paddingVertical: 12 },
  endBadge: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingVertical: 8,
  },
  endBadgeText: {
    textAlign: 'center',
    color: '#1e40af',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default PropertyListScreen;
