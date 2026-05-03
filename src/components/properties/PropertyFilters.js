import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from '../common/Button';
import OptionPickerModal from '../common/OptionPickerModal';

const PropertyFilters = ({ visible, onClose, onApply, initialFilters = {} }) => {
  const [filters, setFilters] = useState({
    minPrice: initialFilters.minPrice || '',
    maxPrice: initialFilters.maxPrice || '',
    bedrooms: initialFilters.bedrooms || '',
    bathrooms: initialFilters.bathrooms || '',
    propertyType: initialFilters.propertyType || '',
    state: initialFilters.state || '',
    city: initialFilters.city || '',
    paymentFrequency: initialFilters.paymentFrequency || '',
    ...initialFilters,
  });

  const [showPicker, setShowPicker] = useState(null);

  const propertyTypes = [
    { label: 'Apartment', value: 'apartment' },
    { label: 'House', value: 'house' },
    { label: 'Duplex', value: 'duplex' },
    { label: 'Bungalow', value: 'bungalow' },
    { label: 'Studio', value: 'studio' },
    { label: 'Mansion', value: 'mansion' },
    { label: 'Commercial', value: 'commercial' },
    { label: 'Short Let', value: 'short_let' },
  ];

  const frequencies = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'Quarterly', value: 'quarterly' },
  ];

  const numberOptions = [
    { label: 'Any', value: '' },
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5+', value: '5' },
  ];

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    const cleaned = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    });
    onApply(cleaned);
  };

  const handleReset = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      propertyType: '',
      state: '',
      city: '',
      paymentFrequency: '',
    });
  };

  const activeCount = Object.values(filters).filter((v) => v !== '').length;

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close-outline" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.label}>Price Range (NGN)</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              value={filters.minPrice}
              onChangeText={(v) => updateFilter('minPrice', v)}
              placeholder="Min"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.priceSeparator}>-</Text>
            <TextInput
              style={styles.priceInput}
              value={filters.maxPrice}
              onChangeText={(v) => updateFilter('maxPrice', v)}
              placeholder="Max"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setShowPicker('propertyType')}
          >
            <Text style={[styles.selectText, !filters.propertyType && styles.placeholder]}>
              {filters.propertyType
                ? propertyTypes.find((t) => t.value === filters.propertyType)?.label
                : 'Property Type'}
            </Text>
            <Icon name="chevron-down-outline" size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setShowPicker('bedrooms')}
          >
            <Text style={[styles.selectText, !filters.bedrooms && styles.placeholder]}>
              {filters.bedrooms ? `${filters.bedrooms} Bedroom(s)` : 'Bedrooms'}
            </Text>
            <Icon name="chevron-down-outline" size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setShowPicker('bathrooms')}
          >
            <Text style={[styles.selectText, !filters.bathrooms && styles.placeholder]}>
              {filters.bathrooms ? `${filters.bathrooms} Bathroom(s)` : 'Bathrooms'}
            </Text>
            <Icon name="chevron-down-outline" size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setShowPicker('paymentFrequency')}
          >
            <Text style={[styles.selectText, !filters.paymentFrequency && styles.placeholder]}>
              {filters.paymentFrequency
                ? frequencies.find((f) => f.value === filters.paymentFrequency)?.label
                : 'Payment Frequency'}
            </Text>
            <Icon name="chevron-down-outline" size={18} color="#64748b" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={filters.city}
            onChangeText={(v) => updateFilter('city', v)}
            placeholder="City"
            placeholderTextColor="#94a3b8"
          />

          <TextInput
            style={styles.textInput}
            value={filters.state}
            onChangeText={(v) => updateFilter('state', v)}
            placeholder="State"
            placeholderTextColor="#94a3b8"
          />
        </ScrollView>

        <View style={styles.footer}>
          <Button title={`Apply Filters${activeCount > 0 ? ` (${activeCount})` : ''}`} onPress={handleApply} />
        </View>
      </View>

      <OptionPickerModal
        visible={showPicker === 'propertyType'}
        title="Property Type"
        options={propertyTypes}
        onClose={() => setShowPicker(null)}
        onSelect={(item) => updateFilter('propertyType', item.value)}
        selectedValue={filters.propertyType}
      />

      <OptionPickerModal
        visible={showPicker === 'bedrooms'}
        title="Bedrooms"
        options={numberOptions}
        onClose={() => setShowPicker(null)}
        onSelect={(item) => updateFilter('bedrooms', item.value)}
        selectedValue={filters.bedrooms}
      />

      <OptionPickerModal
        visible={showPicker === 'bathrooms'}
        title="Bathrooms"
        options={numberOptions}
        onClose={() => setShowPicker(null)}
        onSelect={(item) => updateFilter('bathrooms', item.value)}
        selectedValue={filters.bathrooms}
      />

      <OptionPickerModal
        visible={showPicker === 'paymentFrequency'}
        title="Payment Frequency"
        options={frequencies}
        onClose={() => setShowPicker(null)}
        onSelect={(item) => updateFilter('paymentFrequency', item.value)}
        selectedValue={filters.paymentFrequency}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resetText: { color: '#0284c7', fontWeight: '600' },
  body: { paddingHorizontal: 16 },
  bodyContent: { paddingTop: 12, paddingBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  priceSeparator: { color: '#64748b', fontSize: 16 },
  selectField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  selectText: { color: '#0f172a', fontSize: 15, flex: 1 },
  placeholder: { color: '#94a3b8' },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});

export default PropertyFilters;
