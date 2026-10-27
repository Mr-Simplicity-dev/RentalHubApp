import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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
import { colors, radius, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const FumigationCleaningPaymentScreen = ({ route, navigation }) => {
  useInterfaceLanguage();
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
            title: ui("Pay service booking"),
            subtitle: ui("Complete your fumigation or cleaning booking with secure in-app card payment."),
            amountLabel: formatNaira(booking?.total_price, ''),
            onSuccess: (paymentResponse) => verifyPayment(paymentResponse?.reference || reference),
            onBrowserFallback: () => {
              Toast.show({
                type: 'info',
                text1: ui("Paystack checkout opened"),
                text2: ui("Complete payment securely, then return to RentalHub."),
              });
            },
          });
        } else if (reference) {
          verifyPayment(reference);
        }
      } else {
        Toast.show({ type: 'error', text1: response?.message || ui("Payment failed") });
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
        Toast.show({ type: 'success', text1: ui("Payment verified!") });
        navigation.navigate('FumigationCleaningBookingDetail', { bookingId });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error) });
    }
  };

  if (loading) {
    return <PremiumCenter loading title={ui("Loading payment")} message={ui("Preparing your secure checkout details.")} />;
  }

  if (!booking) {
    return (
      <PremiumCenter
        tone="danger"
        icon="alert-circle-outline"
        title={ui("Booking not found")}
        message={ui("We could not find this fumigation or cleaning booking.")}
        actionLabel={ui("Go back")}
        onAction={() => navigation.goBack()}
      />
    );
  }

  if (booking.payment_status === 'paid') {
    return (
      <PremiumCenter
        tone="success"
        icon="checkmark-circle-outline"
        title={ui("Payment complete")}
        message={ui("Your service booking has already been paid for.")}
        actionLabel={ui("View booking")}
        onAction={() => navigation.navigate('FumigationCleaningBookingDetail', { bookingId })}
      />
    );
  }

  return (
    <>
      <PremiumScreen>
        <PremiumHero
          eyebrow={ui("Secure checkout")}
          title={ui("Complete payment")}
          subtitle={ui("Confirm your fumigation or cleaning booking with protected in-app payment.")}
          icon="sparkles-outline"
        />

        <PremiumCard>
          <PremiumSectionTitle title={ui("Booking summary")} subtitle={ui("Review the service details before you pay.")} />
          <InfoRow icon="sparkles-outline" label={ui("Service")} value={booking.service_name || 'Service'} />
          <InfoRow icon="calendar-outline" label={ui("Date")} value={booking.booking_date} />
          <View style={styles.totalPanel}>
            <View>
              <AppText style={styles.totalLabel}>{ui("Total amount")}</AppText>
              <AppText style={styles.totalHint}>{ui("Processed securely via Paystack")}</AppText>
            </View>
            <AppText style={styles.totalValue}>{formatNaira(booking.total_price)}</AppText>
          </View>
        </PremiumCard>

        <PremiumCard>
          <PremiumSectionTitle title={ui("Payment method")} subtitle={ui("Use card, bank transfer, USSD or supported Paystack channels.")} />
          <View style={styles.methodRow}>
            <View style={styles.methodIcon}>
              <Icon name="shield-checkmark-outline" size={22} color={colors.blue} />
            </View>
            <View style={styles.methodCopy}>
              <AppText style={styles.methodTitle}>{ui("Paystack secure checkout")}</AppText>
              <AppText style={styles.methodText}>{ui("Encrypted payment, instant verification and recovery if the session is interrupted.")}</AppText>
            </View>
          </View>
          <PremiumButton
            title={ui("Pay securely")}
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  totalHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 3,
  },
  totalValue: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xl,
    lineHeight: 32,
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
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  methodText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});

export default FumigationCleaningPaymentScreen;
