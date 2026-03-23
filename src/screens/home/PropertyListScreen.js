import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import PropertyCard from '../../components/properties/PropertyCard';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList } from '../../utils/http';

const PAGE_SIZE = 15;

const PropertyListScreen = ({ route, navigation }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const handledRequestRedirect = useRef(false);

  const filters = useMemo(() => route?.params || {}, [route?.params]);

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
        Boolean(filters.city) ||
        Boolean(filters.property_type);

      const params = { ...filters, page: nextPage, limit: PAGE_SIZE };

      const response = hasSearch
        ? await propertyService.searchProperties(params)
        : await propertyService.browseProperties(nextPage, PAGE_SIZE);

      const list = pickList(response, ['data', 'properties']);
      setItems((prev) => (append ? [...prev, ...list] : list));
      setHasMore(list.length >= PAGE_SIZE);
      setPage(nextPage);
    } catch (error) {
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
  }, [filters.search, filters.state_id, filters.city, filters.property_type]);

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
