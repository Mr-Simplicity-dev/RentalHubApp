import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { transportationService } from '../../services/transportationService';
import { getErrorMessage } from '../../utils/http';
import { recoverPayment, savePendingPayment } from '../../services/paymentRecoveryService';
import useNativePaystackCheckout from '../../hooks/useNativePaystackCheckout';
import { hasPaystackCheckout } from '../../services/nativePaymentService';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  scheduled: '#8b5cf6',
  in_progress: '#06b6d4',
  completed: '#16a34a',
  cancelled: '#ef4444',
  rescheduled: '#f97316',
};

const TransportationBookingDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const { openNativeCheckout, NativePaystackCheckoutModal } = useNativePaystackCheckout();

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
        text2: getErrorMessage(error, 'Could not load booking details'),
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this transportation booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await transportationService.cancelBooking(bookingId);
              Toast.show({ type: 'success', text1: 'Booking cancelled' });
              loadBookingDetails();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Failed to cancel',
                text2: getErrorMessage(error),
              });
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const response = await transportationService.initializeBookingPayment(bookingId);
      if (response?.success) {
        const reference = response.data?.reference;
        if (reference) {
          await savePendingPayment({
            flow: 'transportation',
            reference,
            bookingId,
          });
        }
        if (hasPaystackCheckout(response.data)) {
          openNativeCheckout({
            transaction: response.data,
            title: 'Pay transportation booking',
            subtitle: 'Complete your transport booking with secure in-app Paystack card payment.',
            amountLabel: booking?.total_price ? `₦${Number(booking.total_price).toLocaleString()}` : '',
            onSuccess: (paymentResponse) =>
              completeNativePayment(paymentResponse?.reference || reference),
            onBrowserFallback: () => {
              Toast.show({
                type: 'info',
                text1: 'Paystack checkout opened',
                text2: 'Complete payment securely, then return to RentalHub.',
              });
            },
          });
        } else if (reference) {
          await completeNativePayment(reference);
        }
      } else {
        Toast.show({ type: 'error', text1: response?.message || 'Payment initialization failed' });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Payment Error',
        text2: getErrorMessage(error),
      });
    } finally {
      setPaying(false);
    }
  };

  const completeNativePayment = async (reference) => {
    if (!reference) return;

    try {
      const response = await recoverPayment({
        reference,
        fallbackFlow: 'transportation',
      });
      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Payment verified' });
        await loadBookingDetails();
      } else {
        Toast.show({ type: 'error', text1: response?.message || 'Payment verification failed' });
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

  if (!booking) return null;

  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const canPay = booking.status === 'pending' && !booking.payment_status;

  return (
    <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.statusSection}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[booking.status] || '#6b7280' }]}>
          <Text style={styles.statusText}>
            {(booking.status || '').replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.serviceName}>{booking.service_name || 'Transportation'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <View style={styles.detailItem}>
          <Icon name="location-outline" size={18} color="#64748b" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Pickup</Text>
            <Text style={styles.detailValue}>{booking.pickup_address}</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <Icon name="location-outline" size={18} color="#64748b" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Destination</Text>
            <Text style={styles.detailValue}>{booking.destination_address}</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <Icon name="calendar-outline" size={18} color="#64748b" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {booking.booking_date} at {booking.booking_time}
            </Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <Icon name="resize-outline" size={18} color="#64748b" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Distance</Text>
            <Text style={styles.detailValue}>{booking.estimated_distance_km} km</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.priceRow}>
          <Text>Base Price</Text>
          <Text>₦{booking.base_price?.toLocaleString()}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text>Distance Charge</Text>
          <Text>₦{booking.distance_price?.toLocaleString()}</Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₦{booking.total_price?.toLocaleString()}</Text>
        </View>
        <View style={styles.paymentStatus}>
          <Text>Payment: </Text>
          <Text style={booking.payment_status === 'paid' ? styles.paidText : styles.unpaidText}>
            {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
          </Text>
        </View>
      </View>

      {booking.items_description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Text style={styles.itemsText}>{booking.items_description}</Text>
        </View>
      )}

      {booking.special_requirements && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Requirements</Text>
          <Text style={styles.itemsText}>{booking.special_requirements}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {canPay && (
          <TouchableOpacity style={[styles.payButton, paying && styles.buttonDisabled]} onPress={handlePay} disabled={paying}>
            {paying ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.payButtonText}>Pay Now</Text>}
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
    {NativePaystackCheckoutModal}
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusText: { color: '#ffffff', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  serviceName: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  section: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailContent: { marginLeft: 10, flex: 1 },
  detailLabel: { fontSize: 12, color: '#64748b' },
  detailValue: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: { fontWeight: '700', fontSize: 16 },
  totalValue: { fontWeight: '800', fontSize: 18, color: '#0284c7' },
  paymentStatus: { flexDirection: 'row', marginTop: 8 },
  paidText: { color: '#16a34a', fontWeight: '700' },
  unpaidText: { color: '#ef4444', fontWeight: '700' },
  itemsText: { color: '#475569', fontSize: 14, lineHeight: 20 },
  actions: { padding: 16, gap: 10 },
  payButton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
});

export default TransportationBookingDetailScreen;
