import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { transportationService } from '../../services/transportationService';
import { getErrorMessage } from '../../utils/http';
import { recoverPayment, savePendingPayment } from '../../services/paymentRecoveryService';

const TransportationPaymentScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId]);

  const loadBookingDetails = async () => {
    setLoading(true);
    try {
      const response = await transportationService.getBookingDetails(bookingId);
      setBooking(response?.data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: getErrorMessage(error, 'Could not load booking'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithPaystack = async () => {
    setProcessing(true);
    try {
      const response = await transportationService.initializeBookingPayment(bookingId, 'paystack');
      if (response?.success) {
        const reference = response.data?.reference;
        if (reference) {
          await savePendingPayment({
            flow: 'transportation',
            reference,
            bookingId,
          });
        }
        if (response.data?.authorization_url) {
          await Linking.openURL(response.data.authorization_url);
          Toast.show({
            type: 'info',
            text1: 'Paystack opened',
            text2: 'Complete payment securely, then return to RentalHub.',
          });
        } else if (reference) {
          // Poll for payment verification
          verifyPayment(reference);
        }
      } else {
        Toast.show({ type: 'error', text1: response?.message || 'Payment failed' });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Payment Error',
        text2: getErrorMessage(error),
      });
    } finally {
      setProcessing(false);
    }
  };

  const verifyPayment = async (reference) => {
    try {
      const response = await recoverPayment({
        reference,
        fallbackFlow: 'transportation',
      });
      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Payment verified!' });
        navigation.navigate('TransportationBookingDetail', { bookingId });
      } else {
        Toast.show({ type: 'error', text1: 'Payment verification failed' });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: getErrorMessage(error),
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  if (booking.payment_status === 'paid') {
    return (
      <View style={styles.centerContainer}>
        <Icon name="checkmark-circle" size={80} color="#16a34a" />
        <Text style={styles.successTitle}>Payment Complete</Text>
        <Text style={styles.successText}>
          Your transportation booking has been paid for.
        </Text>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('TransportationBookingDetail', { bookingId })}
        >
          <Text style={styles.viewButtonText}>View Booking</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Icon name="card-outline" size={50} color="#ffffff" />
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <Text style={styles.headerSub}>
          Pay to confirm your transportation booking
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Booking Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service</Text>
          <Text style={styles.summaryValue}>{booking.service_name || 'Transportation'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>{booking.booking_date}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Distance</Text>
          <Text style={styles.summaryValue}>{booking.estimated_distance_km} km</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₦{booking.total_price?.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.paymentMethods}>
        <Text style={styles.paymentTitle}>Select Payment Method</Text>
        <TouchableOpacity
          style={[styles.paymentOption, processing && styles.optionDisabled]}
          onPress={handlePayWithPaystack}
          disabled={processing}
        >
          <Icon name="wallet-outline" size={24} color="#0284c7" />
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Pay with Paystack</Text>
            <Text style={styles.optionDesc}>Credit/Debit card, bank transfer, USSD</Text>
          </View>
          {processing ? (
            <ActivityIndicator color="#0284c7" />
          ) : (
            <Icon name="arrow-forward" size={20} color="#0284c7" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.paymentOption, processing && styles.optionDisabled]}
          onPress={() => handlePayWithPaystack()}
          disabled={processing}
        >
          <Icon name="business-outline" size={24} color="#0284c7" />
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Bank Transfer</Text>
            <Text style={styles.optionDesc}>Pay via direct bank transfer</Text>
          </View>
          <Icon name="arrow-forward" size={20} color="#0284c7" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  header: {
    backgroundColor: '#0284c7',
    padding: 30,
    alignItems: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 12 },
  headerSub: { color: '#e0f2fe', fontSize: 14, marginTop: 6, textAlign: 'center' },
  summaryCard: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: { color: '#64748b' },
  summaryValue: { fontWeight: '600', color: '#0f172a' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#0284c7' },
  paymentMethods: { margin: 16, marginTop: 0 },
  paymentTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionContent: { flex: 1, marginLeft: 12 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  optionDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  optionDisabled: { opacity: 0.6 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#166534', marginTop: 16 },
  successText: { color: '#475569', textAlign: 'center', marginTop: 8 },
  viewButton: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  viewButtonText: { color: '#ffffff', fontWeight: '700' },
  errorText: { fontSize: 16, color: '#ef4444' },
});

export default TransportationPaymentScreen;
