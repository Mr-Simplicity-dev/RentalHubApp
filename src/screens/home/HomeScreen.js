import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import PropertyCard from '../../components/properties/PropertyCard';
import { propertyService } from '../../services/propertyService';
import { getErrorMessage, pickList } from '../../utils/http';

const HomeScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState([]);
  const [locations, setLocations] = useState([]);

  const featuredCards = useMemo(() => featured.slice(0, 6), [featured]);

  const loadHome = async () => {
    setLoading(true);
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
        text1: 'Load failed',
        text2: getErrorMessage(error, 'Could not load home data'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  const goToPropertyList = (params = {}) => {
    navigation.navigate('PropertyList', params);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Verified Rental Homes</Text>
        <Text style={styles.headerText}>
          Browse trusted listings, unlock full property details, and apply faster.
        </Text>
      </View>

      <View style={styles.searchCard}>
        <Icon name="search-outline" size={20} color="#64748b" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by city, state, area..."
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => goToPropertyList({ search })}
        />
        <TouchableOpacity onPress={() => goToPropertyList({ search })} style={styles.searchButton}>
          <Icon name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Featured Properties</Text>
        <TouchableOpacity onPress={() => goToPropertyList()}>
          <Text style={styles.linkText}>Browse all</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" />
      ) : (
        featuredCards.map((item) => (
          <PropertyCard
            key={item.id}
            property={item}
            onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
          />
        ))
      )}

      <Text style={styles.sectionTitle}>Popular States</Text>
      <View style={styles.grid}>
        {locations.map((item) => (
          <TouchableOpacity
            key={item.id || item.state_name}
            style={styles.gridCard}
            onPress={() => goToPropertyList({ state_id: item.id })}
          >
            <Text style={styles.gridTitle}>{item.state_name || item.name}</Text>
            <Text style={styles.gridMeta}>{item.property_count || 0} properties</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.cta} onPress={() => goToPropertyList()}>
        <Text style={styles.ctaText}>Browse Properties</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryCta}
        onPress={() => navigation.navigate('PropertyAlertRequest')}
      >
        <Text style={styles.secondaryCtaText}>Can't find your property? Submit a request</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 24 },
  header: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 30,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  headerText: {
    marginTop: 8,
    color: '#e0f2fe',
    fontSize: 15,
    lineHeight: 21,
  },
  searchCard: {
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    color: '#0f172a',
  },
  searchButton: {
    backgroundColor: '#0284c7',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  linkText: { color: '#0284c7', fontWeight: '700' },
  grid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  gridMeta: { marginTop: 4, color: '#64748b', fontSize: 12 },
  cta: {
    marginHorizontal: 16,
    marginTop: 22,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  secondaryCta: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  secondaryCtaText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default HomeScreen;
