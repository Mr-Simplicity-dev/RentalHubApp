import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { transportationService } from '../../services/transportationService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage } from '../../utils/http';

const SERVICE_ICONS = {
  van: 'car-sport-outline',
  truck: 'car-outline',
  pickup: 'car-outline',
  moving_company: 'cube-outline',
};

const TransportationBookingScreen = ({ route, navigation }) => {
  const { propertyId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState(null);

  const [formData, setFormData] = useState({
    pickup_address: '',
    destination_address: '',
    estimated_distance_km: '',
    booking_date: '',
    booking_time: '09:00',
    items_description: '',
    special_requirements: '',
  });

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Check eligibility if propertyId is provided
        if (propertyId) {
          const eligibilityRes = await transportationService.checkBookingEligibility(propertyId);
          setEligibility(eligibilityRes?.data);

          if (!eligibilityRes?.data?.can_book) {
            Toast.show({
              type: 'error',
              text1: 'Cannot Book Transportation',
              text2: eligibilityRes?.data?.reason || 'Not eligible',
            });
            navigation.goBack();
            return;
          }
        }

        // Load services
        const servicesRes = await transportationService.getAllServices();
        const servicesList = servicesRes?.data || [];
        setServices(servicesList);

        if (servicesList.length > 0) {
          setSelectedService(servicesList[0]);
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Load Failed',
          text2: getErrorMessage(error, 'Could not load transportation data'),
        });
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [propertyId, navigation]);

  // Calculate price when service or distance changes
  useEffect(() => {
    const calculatePrice = async () => {
      if (!selectedService || !formData.estimated_distance_km) {
        setPriceCalculation(null);
        return;
      }

      setCalculatingPrice(true);
      try {
        const response = await transportationService.calculatePrice({
          serviceId: selectedService.id,
          distanceKm: parseFloat(formData.estimated_distance_km),
        });

        if (response?.success) {
          setPriceCalculation(response.data);
        }
      } catch (error) {
        console.error('Error calculating price:', error);
      } finally {
        setCalculatingPrice(false);
      }
    };

    const timeoutId = setTimeout(calculatePrice, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedService, formData.estimated_distance_km]);

  const handleInputChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async () => {
    if (!selectedService) {
      Toast.show({ type: 'error', text1: 'Please select a service' });
      return;
    }

    if (!priceCalculation) {
      Toast.show({ type: 'error', text1: 'Please enter distance to calculate price' });
      return;
    }

    const requiredFields = ['pickup_address', 'destination_address', 'booking_date', 'booking_time'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        Toast.show({ type: 'error', text1: `Please fill in ${field.replace(/_/g, ' ')}` });
        return;
      }
    }

    setCreatingBooking(true);
    try {
      const bookingData = {
        property_id: propertyId,
        service_id: selectedService.id,
        ...formData,
        estimated_distance_km: parseFloat(formData.estimated_distance_km),
      };

      const response = await transportationService.createBooking(bookingData);

      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Booking created successfully' });
        navigation.navigate('TransportationPayment', { bookingId: response.data.id });
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
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={21} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerIcon}><Icon name="car-sport-outline" size={23} color={colors.gold} /></View>
        </View>
        <Text style={styles.headerEyebrow}>MOVING SUPPORT</Text>
        <Text style={styles.headerTitle}>Book transportation</Text>
        <Text style={styles.headerSub}>
          Arrange transportation to move your items
        </Text>
      </View>

      {/* Service Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Service</Text>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              selectedService?.id === service.id && styles.serviceCardSelected,
            ]}
            onPress={() => setSelectedService(service)}
          >
            <View style={styles.serviceHeader}>
              <Icon
                name={SERVICE_ICONS[service.service_type] || 'car-outline'}
                size={24}
                color={selectedService?.id === service.id ? '#0284c7' : '#64748b'}
              />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.service_name}</Text>
                <Text style={styles.serviceType}>{service.service_type.replace(/_/g, ' ')}</Text>
              </View>
              {selectedService?.id === service.id && (
                <Icon name="checkmark-circle" size={20} color="#16a34a" />
              )}
            </View>
            <Text style={styles.serviceDesc}>{service.description}</Text>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceDetailText}>
                Capacity: {service.capacity_kg} kg
              </Text>
              <Text style={styles.servicePrice}>
                ₦{service.base_price?.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.perKmText}>
              + ₦{service.price_per_km?.toLocaleString()} per km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Booking Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pickup Address *</Text>
          <TextInput
            style={styles.input}
            value={formData.pickup_address}
            onChangeText={(v) => handleInputChange('pickup_address', v)}
            placeholder="Where will items be picked up?"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Destination Address *</Text>
          <TextInput
            style={styles.input}
            value={formData.destination_address}
            onChangeText={(v) => handleInputChange('destination_address', v)}
            placeholder="Where are you moving to?"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Distance (km) *</Text>
            <TextInput
              style={styles.input}
              value={formData.estimated_distance_km}
              onChangeText={(v) => handleInputChange('estimated_distance_km', v)}
              placeholder="e.g., 15.5"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              value={formData.booking_date}
              onChangeText={(v) => handleInputChange('booking_date', v)}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Time *</Text>
            <TextInput
              style={styles.input}
              value={formData.booking_time}
              onChangeText={(v) => handleInputChange('booking_time', v)}
              placeholder="HH:MM"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Items</Text>
            <TextInput
              style={styles.input}
              value={formData.items_description}
              onChangeText={(v) => handleInputChange('items_description', v)}
              placeholder="e.g., Furniture, boxes"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Special Requirements</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.special_requirements}
            onChangeText={(v) => handleInputChange('special_requirements', v)}
            placeholder="Any special instructions..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Price Summary */}
        {priceCalculation && (
          <View style={styles.priceCard}>
            <Text style={styles.priceTitle}>Price Summary</Text>
            <View style={styles.priceRow}>
              <Text>Base Price:</Text>
              <Text style={styles.priceValue}>₦{priceCalculation.base_price?.toLocaleString()}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text>Distance Charge ({formData.estimated_distance_km} km):</Text>
              <Text style={styles.priceValue}>₦{priceCalculation.distance_price?.toLocaleString()}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₦{priceCalculation.total_price?.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {calculatingPrice && (
          <View style={styles.calculatingContainer}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={styles.calculatingText}>Calculating price...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, (creatingBooking || !priceCalculation) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={creatingBooking || !priceCalculation}
        >
          {creatingBooking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Proceed to Payment</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  header: {
    backgroundColor: colors.navy,
    padding: 20,
    borderRadius: radius.lg,
    marginBottom: 14,
    ...shadows.soft,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  headerEyebrow: { fontFamily: typography.semibold, fontSize: 13, letterSpacing: 1.25, color: colors.gold },
  headerTitle: { marginTop: 7, color: colors.white, fontFamily: typography.bold, fontSize: 24 },
  headerSub: { color: '#B9C9E5', fontFamily: typography.regular, fontSize: 14, lineHeight: 20, marginTop: 6 },
  section: {
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: colors.ink,
    marginBottom: 12,
  },
  serviceCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  serviceCardSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.surfaceBlue,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfo: { flex: 1, marginLeft: 10 },
  serviceName: { fontSize: 16, fontFamily: typography.semibold, color: colors.ink },
  serviceType: { fontSize: 13, color: '#64748b', textTransform: 'capitalize' },
  serviceDesc: { color: '#475569', fontSize: 13, marginTop: 8 },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  serviceDetailText: { color: '#64748b', fontSize: 13 },
  servicePrice: { fontFamily: typography.bold, color: colors.blue, fontSize: 16 },
  perKmText: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
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
  totalRow: { borderTopWidth: 1, borderTopColor: '#bbf7d0', paddingTop: 8, marginTop: 8 },
  totalLabel: { fontSize: 16, fontFamily: typography.bold, color: '#166534' },
  totalValue: { fontSize: 20, fontFamily: typography.bold, color: '#166534' },
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  calculatingText: { marginLeft: 8, color: '#64748b' },
  submitButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.white, fontSize: 16, fontFamily: typography.semibold },
});

export default TransportationBookingScreen;
