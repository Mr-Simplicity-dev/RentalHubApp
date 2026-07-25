import React, { useEffect, useState } from 'react';
import {Alert, StyleSheet View} from 'react-native';
import Toast from 'react-native-toast-message';
import { fumigationCleaningService } from '../../services/fumigationCleaningService';
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

import AppText from '../../components/common/AppText';
const STATUS_COLORS = {
  pending: '#B7791F',
  confirmed: colors.blue,
  scheduled: '#7C3AED',
  in_progress: '#0891B2',
  completed: colors.success,
  cancelled: colors.danger,
  rescheduled: '#EA580C',
};

const FumigationCleaningBookingDetailScreen = ({ route, navigation }) => {
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
      const response = await fumigationCleaningService.getBookingDetails(bookingId);
      setBooking(response?.data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: getErrorMessage(error),
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this service booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await fumigationCleaningService.cancelBooking(bookingId);
            Toast.show({ type: 'success', text1: 'Booking cancelled' });
            loadBookingDetails();
          } catch (error) {
            Toast.show({ type: 'error', text1: getErrorMessage(error) });
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const response = await fumigationCleaningService.initializeBookingPayment(bookingId);
      if (response?.success) {
        const reference = response.data?.reference;
        if (reference) {
          await savePendingPayment({
            flow: 'fumigation',
            reference,
            bookingId,
          });
        }
        if (hasPaystackCheckout(response.data)) {
          openNativeCheckout({
            transaction: response.data,
            title: 'Pay service booking',
            subtitle: 'Complete your fumigation or cleaning booking with secure in-app card payment.',
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
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error) });
    } finally {
      setPaying(false);
    }
  };

  const completeNativePayment = async (reference) => {
    if (!reference) return;

    try {
      const response = await recoverPayment({
        reference,
        fallbackFlow: 'fumigation',
      });
      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Payment verified' });
        await loadBookingDetails();
      } else {
        Toast.show({ type: 'error', text1: response?.message || 'Payment verification failed' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error) });
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading booking" message="Fetching your service booking details." />;
  }

  if (!booking) {
    return (
      <PremiumCenter
        tone="danger"
        icon="alert-circle-outline"
        title="Booking unavailable"
        message="We could not load this service booking."
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
          eyebrow="Fumigation & cleaning"
          title={booking.service_name || 'Service booking'}
          subtitle="Track schedule, payment status and service requirements from one clean screen."
          icon="sparkles-outline"
          right={<StatusPill label={booking.status || 'pending'} color={statusColor} />}
        />

        <PremiumCard>
          <PremiumSectionTitle title="Booking details" subtitle="Service schedule and request information." />
          <InfoRow icon="calendar-outline" label="Date & time" value={`${booking.booking_date || '—'} at ${booking.booking_time || '—'}`} />
          <InfoRow icon="sparkles-outline" label="Service" value={booking.service_name || 'Service'} />
        </PremiumCard>

        <PremiumCard>
          <PremiumSectionTitle title="Payment" subtitle="Total amount and completion status." />
          <View style={styles.totalPanel}>
            <View>
              <AppText style={styles.totalLabel}>Total</AppText>
              <AppText style={styles.paymentStatus}>
                Payment {booking.payment_status === 'paid' ? 'completed' : 'pending'}
              </AppText>
            </View>
            <AppText style={styles.totalValue}>{formatNaira(booking.total_price)}</AppText>
          </View>
        </PremiumCard>

        {booking.special_requirements ? (
          <PremiumCard>
            <PremiumSectionTitle title="Special requirements" />
            <AppText style={styles.bodyText}>{booking.special_requirements}</AppText>
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
  totalPanel: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderColor: '#CFE2FF',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
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

export default FumigationCleaningBookingDetailScreen;
