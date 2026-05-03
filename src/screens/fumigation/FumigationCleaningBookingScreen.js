import React, { useState, useEffect, useCallback } from 'react';
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
import { fumigationCleaningService } from '../../services/fumigationCleaningService';
import { getErrorMessage } from '../../utils/http';

const FumigationCleaningBookingScreen = ({ route, navigation }) => {
  const { propertyId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState(null);

  const [formData, setFormData] = useState({
    booking_date: '',
    booking_time: '09:00',
    special_requirements: '',
    selected_addons: [],
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (propertyId) {
          const eligibilityRes = await fumigationCleaningService.checkBookingEligibility(propertyId);
          setEligibility(eligibilityRes?.data);

          if (!eligibilityRes?.data?.can_book) {
            Toast.show({
              type: 'error',
              text1: 'Cannot Book',
              text2: eligibilityRes?.data?.reason || 'Not eligible',
            });
            navigation.goBack();
            return;
          }
        }

        const [servicesRes, categoriesRes] = await Promise.all([
          fumigationCleaningService.getAllServices(),
          fumigationCleaningService.getServiceCategories(),
        ]);

        setServices(servicesRes?.data || []);
        setCategories(categoriesRes?.data || []);

        if (categoriesRes?.data?.length > 0) {
          setSelectedCategory(categoriesRes.data[0]);
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Load Failed',
          text2: getErrorMessage(error, 'Could not load services'),
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [propertyId, navigation]);

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category_id === selectedCategory.id)
    : services;

  useEffect(() => {
    const calcPrice = async () => {
      if (!selectedService) {
        setPriceCalculation(null);
        return;
      }

      setCalculatingPrice(true);
      try {
        const response = await fumigationCleaningService.calculateServicePrice({
          serviceId: selectedService.id,
          selectedAddons: formData.selected_addons,
        });

        if (response?.success) {
          setPriceCalculation(response.data);
        }
      } catch (error) {
        console.error('Price calculation error:', error);
      } finally {
        setCalculatingPrice(false);
      }
    };

    const timeoutId = setTimeout(calcPrice, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedService, formData.selected_addons]);

  const handleInputChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async () => {
    if (!selectedService) {
      Toast.show({ type: 'error', text1: 'Please select a service' });
      return;
    }

    if (!formData.booking_date) {
      Toast.show({ type: 'error', text1: 'Please select a date' });
      return;
    }

    setCreatingBooking(true);
    try {
      const bookingData = {
        property_id: propertyId,
        service_id: selectedService.id,
        ...formData,
        total_price: priceCalculation?.total_price,
      };

      const response = await fumigationCleaningService.createBooking(bookingData);

      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Booking created!' });
        navigation.navigate('FumigationCleaningPayment', { bookingId: response.data.id });
      } else {
        Toast.show({ type: 'error', text1: response?.message || 'Failed to create booking' });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: getErrorMessage(error, 'Failed to create booking'),
      });
    } finally {
      setCreatingBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book Fumigation & Cleaning</Text>
        <Text style={styles.headerSub}>
          Professional fumigation and cleaning services
        </Text>
      </View>

      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Type</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory?.id === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory?.id === cat.id && styles.categoryChipTextSelected,
                ]}
              >
                {cat.category_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Service Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Service Package</Text>
        {filteredServices.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              selectedService?.id === service.id && styles.serviceCardSelected,
            ]}
            onPress={() => setSelectedService(service)}
          >
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceName}>{service.service_name}</Text>
              {selectedService?.id === service.id && (
                <Icon name="checkmark-circle" size={20} color="#16a34a" />
              )}
            </View>
            <Text style={styles.serviceDesc}>{service.description}</Text>
            <Text style={styles.servicePrice}>
              ₦{service.base_price?.toLocaleString()}
            </Text>
            {service.estimated_duration && (
              <Text style={styles.durationText}>
                Duration: ~{service.estimated_duration} mins
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Booking Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred Date *</Text>
          <TextInput
            style={styles.input}
            value={formData.booking_date}
            onChangeText={(v) => handleInputChange('booking_date', v)}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred Time</Text>
          <TextInput
            style={styles.input}
            value={formData.booking_time}
            onChangeText={(v) => handleInputChange('booking_time', v)}
            placeholder="HH:MM"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Special Requirements</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.special_requirements}
            onChangeText={(v) => handleInputChange('special_requirements', v)}
            placeholder="Any specific instructions..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Price Summary */}
        {priceCalculation && (
          <View style={styles.priceCard}>
            <Text style={styles.priceTitle}>Price Summary</Text>
            <View style={styles.priceRow}>
              <Text>Service Price:</Text>
              <Text style={styles.priceValue}>
                ₦{priceCalculation.service_price?.toLocaleString()}
              </Text>
            </View>
            {priceCalculation.addons_price > 0 && (
              <View style={styles.priceRow}>
                <Text>Add-ons:</Text>
                <Text style={styles.priceValue}>
                  ₦{priceCalculation.addons_price?.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                ₦{priceCalculation.total_price?.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {calculatingPrice && (
          <View style={styles.calculatingContainer}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={styles.calculatingText}>Calculating...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, (creatingBooking || !selectedService) && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={creatingBooking || !selectedService}
        >
          {creatingBooking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Proceed to Payment</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 30,
  },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#e0f2fe', fontSize: 14, marginTop: 6 },
  section: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipSelected: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  categoryChipText: { color: '#475569', fontWeight: '600' },
  categoryChipTextSelected: { color: '#ffffff' },
  serviceCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  serviceCardSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  serviceDesc: { color: '#475569', fontSize: 13, marginTop: 6 },
  servicePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284c7',
    marginTop: 8,
  },
  durationText: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  priceCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  priceTitle: { fontWeight: '700', color: '#166534', fontSize: 16, marginBottom: 8 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceValue: { fontWeight: '600' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#bbf7d0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#166534' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#166534' },
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  calculatingText: { marginLeft: 8, color: '#64748b' },
  submitButton: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});

export default FumigationCleaningBookingScreen;
