import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, typography } from '../../theme';

const SERVICE_CATEGORIES = [
  {
    id: 'fumigation',
    name: 'Fumigation Services',
    description: 'Professional pest control and fumigation for residential and commercial properties.',
    priceRange: '₦15,000 - ₦150,000',
    icon: 'bug-outline',
    color: '#7C3AED',
  },
  {
    id: 'cleaning',
    name: 'Cleaning Services',
    description: 'Deep cleaning, move-in/move-out cleaning, and regular maintenance cleaning.',
    priceRange: '₦10,000 - ₦80,000',
    icon: 'sparkles-outline',
    color: colors.blue,
  },
  {
    id: 'sanitation',
    name: 'Sanitation Services',
    description: 'Waste disposal, drainage cleaning, and environmental sanitation.',
    priceRange: '₦8,000 - ₦60,000',
    icon: 'water-outline',
    color: colors.success,
  },
  {
    id: 'disinfection',
    name: 'Disinfection & Sterilization',
    description: 'Hospital-grade disinfection for offices, homes, and commercial spaces.',
    priceRange: '₦20,000 - ₦200,000',
    icon: 'flask-outline',
    color: '#A66B00',
  },
  {
    id: 'carpet_upholstery',
    name: 'Carpet & Upholstery Care',
    description: 'Professional steam cleaning for carpets, rugs, sofas and upholstery.',
    priceRange: '₦12,000 - ₦90,000',
    icon: 'shirt-outline',
    color: '#0891B2',
  },
  {
    id: 'water_treatment',
    name: 'Water Treatment',
    description: 'Water purification, tank cleaning, and borehole treatment services.',
    priceRange: '₦25,000 - ₦180,000',
    icon: 'water-outline',
    color: '#2563EB',
  },
];

const FumigationCleaningCatalogScreen = ({ navigation }) => {
  const handleSelectService = (service) => {
    navigation.navigate('FumigationCleaningBooking', { category: service.id, serviceName: service.name });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fumigation & Cleaning</Text>
        <Text style={styles.headerSubtitle}>Choose a service category to book</Text>
      </View>

      <FlatList
        data={SERVICE_CATEGORIES}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleSelectService(item)} activeOpacity={0.9}>
            <View style={styles.cardTop}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}16` }]}>
                <Icon name={item.icon} size={24} color={item.color} />
              </View>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.priceLabel}>Estimated price range</Text>
              <Text style={styles.priceValue}>{item.priceRange}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
  },
  headerSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  list: {
    padding: 18,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  cardDesc: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  cardFooter: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  priceLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  priceValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
    marginTop: 2,
  },
});

export default FumigationCleaningCatalogScreen;
