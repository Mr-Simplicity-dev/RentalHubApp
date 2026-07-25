import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../common/Button';
import OptionPickerModal from '../common/OptionPickerModal';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const propertyTypes = [
  { label: 'Any property type', value: '' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'House', value: 'house' },
  { label: 'Duplex', value: 'duplex' },
  { label: 'Bungalow', value: 'bungalow' },
  { label: 'Studio', value: 'studio' },
  { label: 'Mansion', value: 'mansion' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Short let', value: 'short_let' },
];

const frequencies = [
  { label: 'Any payment schedule', value: '' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Quarterly', value: 'quarterly' },
];

const numberOptions = [
  { label: 'Any', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
  { label: '5+', value: '5' },
];

const emptyFilters = {
  min_price: '',
  max_price: '',
  bedrooms: '',
  bathrooms: '',
  property_type: '',
  state: '',
  city: '',
  payment_frequency: '',
};

const normalise = (source = {}) => ({
  min_price: source.min_price || source.minPrice || '',
  max_price: source.max_price || source.maxPrice || '',
  bedrooms: source.bedrooms || '',
  bathrooms: source.bathrooms || '',
  property_type: source.property_type || source.propertyType || '',
  state: source.state || '',
  city: source.city || '',
  payment_frequency: source.payment_frequency || source.paymentFrequency || '',
});

const PropertyFilters = ({ visible, onClose, onApply, initialFilters = {} }) => {
  const [filters, setFilters] = useState(normalise(initialFilters));
  const [showPicker, setShowPicker] = useState(null);

  useEffect(() => {
    if (visible) {
      setFilters(normalise(initialFilters));
    }
  }, [visible, initialFilters]);

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const activeCount = Object.values(filters).filter(
    (value) => value !== '' && value !== null && value !== undefined
  ).length;

  const handleApply = () => {
    const cleaned = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    });
    onApply(cleaned);
  };

  const renderSelect = (label, value, options, picker) => {
    const selected = options.find((item) => String(item.value) === String(value));
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowPicker(picker)}
        style={styles.select}>
        <View>
          <AppText style={styles.selectLabel}>{label}</AppText>
          <AppText style={[styles.selectValue, !value && styles.placeholder]}>
            {selected?.label || `Any ${label.toLowerCase()}`}
          </AppText>
        </View>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <View style={styles.header}>
            <View>
              <AppText style={styles.eyebrow}>REFINE RESULTS</AppText>
              <AppText style={styles.title}>Property filters</AppText>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close filters"
              onPress={onClose}
              style={styles.closeButton}>
              <Icon name="close" size={22} color={colors.navy} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <AppText style={styles.sectionTitle}>Budget</AppText>
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <AppText style={styles.currency}>₦</AppText>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(value) => updateFilter('min_price', value)}
                  placeholder="Minimum"
                  placeholderTextColor="#96A2B8"
                  style={styles.priceInput}
                  value={filters.min_price}
                />
              </View>
              <View style={styles.priceField}>
                <AppText style={styles.currency}>₦</AppText>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={(value) => updateFilter('max_price', value)}
                  placeholder="Maximum"
                  placeholderTextColor="#96A2B8"
                  style={styles.priceInput}
                  value={filters.max_price}
                />
              </View>
            </View>

            <AppText style={styles.sectionTitle}>Property</AppText>
            {renderSelect('Property type', filters.property_type, propertyTypes, 'property_type')}
            <View style={styles.twoColumn}>
              <View style={styles.column}>
                {renderSelect('Bedrooms', filters.bedrooms, numberOptions, 'bedrooms')}
              </View>
              <View style={styles.column}>
                {renderSelect('Bathrooms', filters.bathrooms, numberOptions, 'bathrooms')}
              </View>
            </View>
            {renderSelect(
              'Payment schedule',
              filters.payment_frequency,
              frequencies,
              'payment_frequency'
            )}

            <AppText style={styles.sectionTitle}>Location</AppText>
            <View style={styles.textField}>
              <Icon name="location-outline" size={19} color={colors.muted} />
              <TextInput
                onChangeText={(value) => updateFilter('city', value)}
                placeholder="City or area"
                placeholderTextColor="#96A2B8"
                style={styles.textInput}
                value={filters.city}
              />
            </View>
            <View style={styles.textField}>
              <Icon name="map-outline" size={19} color={colors.muted} />
              <TextInput
                onChangeText={(value) => updateFilter('state', value)}
                placeholder="State"
                placeholderTextColor="#96A2B8"
                style={styles.textInput}
                value={filters.state}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => setFilters(emptyFilters)}
              style={styles.resetButton}>
              <AppText style={styles.resetText}>Reset all</AppText>
            </TouchableOpacity>
            <Button
              title={`Show properties${activeCount ? ` (${activeCount})` : ''}`}
              onPress={handleApply}
              style={styles.applyButton}
            />
          </View>
        </KeyboardAvoidingView>

        <OptionPickerModal
          visible={Boolean(showPicker)}
          title={
            showPicker === 'property_type'
              ? 'Property type'
              : showPicker === 'payment_frequency'
                ? 'Payment schedule'
                : showPicker === 'bedrooms'
                  ? 'Bedrooms'
                  : 'Bathrooms'
          }
          options={
            showPicker === 'property_type'
              ? propertyTypes
              : showPicker === 'payment_frequency'
                ? frequencies
                : numberOptions
          }
          onClose={() => setShowPicker(null)}
          onSelect={(item) => {
            updateFilter(showPicker, item.value);
            setShowPicker(null);
          }}
          selectedValue={showPicker ? filters[showPicker] : ''}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 17,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    marginTop: 3,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  body: {
    padding: 22,
    paddingBottom: 30,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    marginBottom: 11,
    marginTop: 13,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 13,
  },
  priceField: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: 14,
  },
  currency: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  priceInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
    paddingHorizontal: 8,
  },
  select: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
    minHeight: 58,
    paddingHorizontal: 15,
  },
  selectLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  selectValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
    marginTop: 2,
  },
  placeholder: {
    color: colors.text,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 10,
  },
  column: {
    flex: 1,
  },
  textField: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 11,
    minHeight: 54,
    paddingHorizontal: 15,
  },
  textInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
    paddingHorizontal: 10,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 15,
  },
  resetText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  applyButton: {
    flex: 1,
  },
});

export default PropertyFilters;
