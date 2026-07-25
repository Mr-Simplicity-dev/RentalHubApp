import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { transportationService } from '../../services/transportationService';
import { getErrorMessage } from '../../utils/http';
import { recoverPayment, savePendingPayment } from '../../services/paymentRecoveryService';
import useNativePaystackCheckout from '../../hooks/useNativePaystackCheckout';
import { hasPaystackCheckout } from '../../services/nativePaymentService';
import {
  formatNaira,
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { colors, radius, typography } from '../../theme';

const STATUS_COLORS = {
  pending: '#B7791F',
  confirmed: colors.blue,
  scheduled: '#7C3AED',
  in_progress: '#0891B2',
  completed: colors.success,
  cancelled: colors.danger,
  rescheduled: '#EA580C',
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
            amountLabel: formatNaira(booking?.total_price, ''),
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
    return <PremiumCenter loading title="Loading booking" message="Fetching your transportation booking details." />;
  }

  if (!booking) {
    return (
      <PremiumCenter
        tone="danger"
        icon="alert-circle-outline"
        title="Booking unavailable"
        message="We could not load this transportation booking."
        actionLabel="Go back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const canPay = booking.status === 'pending' && !booking.payment_status;
  const statusColor = STATUS_COLORS[booking.status] || colors.muted;

  return (
    <>
      <PremiumScreen>
        <PremiumHero
          eyebrow="Transportation"
          title={booking.service_name || 'Transportation booking'}
          subtitle="Track trip details, payment status and next actions from one clean screen."
          icon="car-outline"
          right={<StatusPill label={booking.status || 'pending'} color={statusColor} />}
        />

        <PremiumCard>
          <PremiumSectionTitle title="Trip details" subtitle="Pickup, destination and schedule." />
          <InfoRow icon="location-outline" label="Pickup" value={booking.pickup_address} />
          <InfoRow icon="navigate-outline" label="Destination" value={booking.destination_address} />
          <InfoRow icon="calendar-outline" label="Date & time" value={`${booking.booking_date || '—'} at ${booking.booking_time || '—'}`} />
          <InfoRow icon="resize-outline" label="Distance" value={booking.estimated_distance_km ? `${booking.estimated_distance_km} km` : '—'} />
        </PremiumCard>

        <PremiumCard>
          <PremiumSectionTitle title="Payment" subtitle="Charges and payment completion status." />
          <View style={styles.priceLine}>
            <Text style={styles.priceLabel}>Base price</Text>
            <Text style={styles.priceValue}>{formatNaira(booking.base_price)}</Text>
          </View>
          <View style={styles.priceLine}>
            <Text style={styles.priceLabel}>Distance charge</Text>
            <Text style={styles.priceValue}>{formatNaira(booking.distance_price)}</Text>
          </View>
          <View style={styles.totalPanel}>
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.paymentStatus}>
                Payment {booking.payment_status === 'paid' ? 'completed' : 'pending'}
              </Text>
            </View>
            <Text style={styles.totalValue}>{formatNaira(booking.total_price)}</Text>
          </View>
        </PremiumCard>

        {booking.items_description ? (
          <PremiumCard>
            <PremiumSectionTitle title="Items" />
            <Text style={styles.bodyText}>{booking.items_description}</Text>
          </PremiumCard>
        ) : null}

        {booking.special_requirements ? (
          <PremiumCard>
            <PremiumSectionTitle title="Special requirements" />
            <Text style={styles.bodyText}>{booking.special_requirements}</Text>
          </PremiumCard>
        ) : null}

        <View style={styles.actions}>
          {canPay ? (
            <PremiumButton
              title="Pay now"
              icon="card-outline"
              loading={paying}
              disabled={paying}
              onPress={handlePay}
            />
          ) : null}
          {canCancel ? (
            <PremiumButton
              title="Cancel booking"
              variant="ghost"
              icon="close-circle-outline"
              loading={cancelling}
              disabled={cancelling}
              onPress={handleCancel}
            />
          ) : null}
        </View>
      </PremiumScreen>
      {NativePaystackCheckoutModal}
    </>
  );
};

const styles = StyleSheet.create({
  priceLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  priceLabel: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  priceValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  totalPanel: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderColor: '#CFE2FF',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 14,
  },
  totalLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  paymentStatus: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 3,
  },
  totalValue: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  bodyText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    gap: 10,
    marginTop: 2,
  },
});

export default TransportationBookingDetailScreen;
