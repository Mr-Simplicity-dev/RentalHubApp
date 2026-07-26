import React, { useEffect, useState } from 'react';
import {StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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
} from '../../components/common/PremiumLayout';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const FumigationCleaningPaymentScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
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
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'Could not load booking') });
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithPaystack = async () => {
    setProcessing(true);
    try {
      const response = await fumigationCleaningService.initializeBookingPayment(bookingId, 'paystack');
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
            onSuccess: (paymentResponse) => verifyPayment(paymentResponse?.reference || reference),
            onBrowserFallback: () => {
              Toast.show({
                type: 'info',
                text1: 'Paystack checkout opened',
                text2: 'Complete payment securely, then return to RentalHub.',
              });
            },
          });
        } else if (reference) {
          verifyPayment(reference);
        }
      } else {
        Toast.show({ type: 'error', text1: response?.message || 'Payment failed' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error) });
    } finally {
      setProcessing(false);
    }
  };

  const verifyPayment = async (reference) => {
    try {
      const response = await recoverPayment({
        reference,
        fallbackFlow: 'fumigation',
      });
      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Payment verified!' });
        navigation.navigate('FumigationCleaningBookingDetail', { bookingId });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error) });
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading payment" message="Preparing your secure checkout details." />;
  }

  if (!booking) {
    return (
      <PremiumCenter
        tone="danger"
        icon="alert-circle-outline"
        title="Booking not found"
        message="We could not find this fumigation or cleaning booking."
        actionLabel="Go back"
        onAction={() => navigation.goBack()}
      />
    );
  }

  if (booking.payment_status === 'paid') {
    return (
      <PremiumCenter
        tone="success"
        icon="checkmark-circle-outline"
        title="Payment complete"
        message="Your service booking has already been paid for."
        actionLabel="View booking"
        onAction={() => navigation.navigate('FumigationCleaningBookingDetail', { bookingId })}
      />
    );
  }

  return (
    <>
      <PremiumScreen>
        <PremiumHero
          eyebrow="Secure checkout"
          title="Complete payment"
          subtitle="Confirm your fumigation or cleaning booking with protected in-app payment."
          icon="sparkles-outline"
        />

        <PremiumCard>
          <PremiumSectionTitle title="Booking summary" subtitle="Review the service details before you pay." />
          <InfoRow icon="sparkles-outline" label="Service" value={booking.service_name || 'Service'} />
          <InfoRow icon="calendar-outline" label="Date" value={booking.booking_date} />
          <View style={styles.totalPanel}>
            <View>
              <AppText style={styles.totalLabel}>Total amount</AppText>
              <AppText style={styles.totalHint}>Processed securely via Paystack</AppText>
            </View>
            <AppText style={styles.totalValue}>{formatNaira(booking.total_price)}</AppText>
          </View>
        </PremiumCard>

        <PremiumCard>
          <PremiumSectionTitle title="Payment method" subtitle="Use card, bank transfer, USSD or supported Paystack channels." />
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}>
              <Icon name="shield-checkmark-outline" size={22} color={colors.blue} />
            </View>
            <View style={styles.methodCopy}>
              <AppText style={styles.methodTitle}>Paystack secure checkout</AppText>
              <AppText style={styles.methodText}>Encrypted payment, instant verification and recovery if the session is interrupted.</AppText>
            </View>
          </View>
          <PremiumButton
            title="Pay securely"
            icon="lock-closed-outline"
            loading={processing}
            disabled={processing}
            onPress={handlePayWithPaystack}
          />
        </PremiumCard>
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
    marginTop: 14,
    padding: 14,
  },
  totalLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  totalHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  totalValue: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 24,
  },
  methodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  methodIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  methodCopy: {
    flex: 1,
  },
  methodTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  methodText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
});

export default FumigationCleaningPaymentScreen;
