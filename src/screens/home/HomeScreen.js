 import React, { useState, useEffect } from 'react'; import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, } from 'react-native'; import { propertyService } from '../../services/propertyService'; import PropertyCard from '../../components/properties/PropertyCard'; import Icon from 'react-native-vector-icons/Ionicons'; import Toast from 'react-native-toast-message';

const HomeScreen = ({ navigation }) => { const [featuredProperties, setFeaturedProperties] = useState([]); const [popularLocations, setPopularLocations] = useState([]); const [loading, setLoading] = useState(true); const [searchQuery, setSearchQuery] = useState('');

useEffect(() => { loadData(); }, []);

const loadData = async () => { try { const [featured, locations] = await Promise.all([ proper
     propertyService.browseProperties(1, 6),
        propertyService.getStates(),
      ]);

      if (featured.success) {
        setFeaturedProperties(featured.data);
      }
      if (locations.success) {
        setPopularLocations(locations.data.slice(0, 6));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    navigation.navigate('PropertyList', { search: searchQuery });
  };

  const handleSaveProperty = async (propertyId) => {
    try {
      await propertyService.saveProperty(propertyId);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Property saved to favorites',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to save property',
      });
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Your Perfect Home</Text>
        <Text style={styles.headerSubtitle}>
          Browse thousands of verified properties across Nigeria
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by location, property type..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Icon name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <FeatureCard
          icon="shield-checkmark-outline"
          title="Verified Properties"
          description="All properties verified with NIN"
        />
        <FeatureCard
          icon="home-outline"
          title="Wide Selection"
          description="Thousands of properties"
        />
        <FeatureCard
          icon="checkmark-circle-outline"
          title="Easy Process"
          description="Simple online application"
        />
      </View>

      {/* Featured Properties */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Properties</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PropertyList')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {featuredProperties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onPress={() => navigation.navigate('PropertyDetail', { id: property.id })}
            onSave={handleSaveProperty}
          />
        ))}
      </View>

      {/* Popular Locations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Locations</Text>
        <View style={styles.locationsGrid}>
          {popularLocations.map((location) => (
            <TouchableOpacity
              key={location.id}
              style={styles.locationCard}
              onPress={() =>
                navigation.navigate('PropertyList', { state_id: location.id })
              }>
              <Text style={styles.locationName}>{location.state_name}</Text>
              <Text style={styles.locationCount}>
                {location.property_count || 0} properties
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaContainer}>
        <Text style={styles.ctaTitle}>Ready to find your next home?</Text>
        <Text style={styles.ctaSubtitle}>
          Join thousands of Nigerians who have found their perfect rental
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('PropertyList')}>
          <Text style={styles.ctaButtonText}>Browse Properties</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIconContainer}>
      <Icon name={icon} size={28} color="#0284c7" />
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDescription}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#0284c7',
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0f2fe',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: -24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  searchButton: {
    backgroundColor: '#0284c7',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#0284c7',
    fontWeight: '600',
  },
  locationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  locationCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  locationCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  ctaContainer: {
    backgroundColor: '#0284c7',
    padding: 32,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#e0f2fe',
    marginBottom: 24,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284c7',
  },
});

export default HomeScreen;