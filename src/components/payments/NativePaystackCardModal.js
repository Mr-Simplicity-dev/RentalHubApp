import React, { useMemo, useState } from 'react';
import {ActivityIndicator,
  Modal,
  Platform,
  StyleSheet
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import {
  canUseNativePaystackCard,
  describeNativePaystackStatus,
  getPaystackAuthorizationUrl,
  launchNativePaystackCheckout,
  openPaystackBrowserCheckout,
} from '../../services/nativePaymentService';
import { getErrorMessage } from '../../utils/http';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const NativePaystackCardModal = ({
  visible,
  transaction,
  title = 'Pay securely',
  subtitle = 'Complete this payment with Paystack secure checkout.',
  amountLabel = '',
  onCancel,
  onBrowserFallback,
  onSuccess,
}) => {
  const [launching, setLaunching] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  const nativeStatus = useMemo(() => describeNativePaystackStatus(transaction), [transaction]);
  const browserUrl = getPaystackAuthorizationUrl(transaction);
  const nativeAvailable = canUseNativePaystackCard(transaction);

  const handleNativeCheckout = async () => {
    try {
      setLaunching(true);
      const response = await launchNativePaystackCheckout(transaction);
      onSuccess?.(response);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Payment not completed',
        text2: getErrorMessage(error, 'Could not complete Paystack payment.'),
      });
    } finally {
      setLaunching(false);
    }
  };

  const handleFallback = async () => {
    try {
      setFallbackLoading(true);
      await openPaystackBrowserCheckout(transaction);
      onBrowserFallback?.();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Checkout unavailable',
        text2: getErrorMessage(error, 'Could not open Paystack checkout.'),
      });
    } finally {
      setFallbackLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.brandIcon}>
              <Icon name="shield-checkmark" size={22} color="#ffffff" />
            </View>
            <View style={styles.headerCopy}>
              <AppText style={styles.title}>{title}</AppText>
              <AppText style={styles.subtitle}>{subtitle}</AppText>
            </View>
            <TouchableOpacity accessibilityLabel="Close payment" onPress={onCancel} style={styles.closeButton}>
              <Icon name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {amountLabel ? (
            <View style={styles.amountCard}>
              <AppText style={styles.amountLabel}>Amount</AppText>
              <AppText style={styles.amountValue}>{amountLabel}</AppText>
            </View>
          ) : null}

          {nativeAvailable ? (
            <View style={styles.nativeCard}>
              <Icon name="phone-portrait-outline" size={26} color="#0A66C2" />
              <AppText style={styles.nativeTitle}>Use native Paystack checkout</AppText>
              <AppText style={styles.nativeText}>
                Paystack will open a secure in-app payment sheet. RentalHub does not collect or store your card details.
              </AppText>
              <TouchableOpacity
                disabled={launching || fallbackLoading}
                onPress={handleNativeCheckout}
                style={[styles.primaryButton, (launching || fallbackLoading) && styles.disabled]}>
                {launching ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <AppText style={styles.primaryText}>Continue securely</AppText>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fallbackCard}>
              <Icon name="information-circle-outline" size={22} color="#0A66C2" />
              <AppText style={styles.fallbackTitle}>Native Paystack sheet is not active here</AppText>
              <AppText style={styles.fallbackText}>
                {nativeStatus.reason || 'Use Paystack checkout to complete this payment.'}
              </AppText>
            </View>
          )}

          {browserUrl ? (
            <TouchableOpacity
              disabled={launching || fallbackLoading}
              onPress={handleFallback}
              style={[styles.secondaryButton, (launching || fallbackLoading) && styles.disabled]}>
              {fallbackLoading ? (
                <ActivityIndicator color="#0A66C2" />
              ) : (
                <AppText style={styles.secondaryText}>
                  {nativeAvailable ? 'Use Paystack browser checkout instead' : 'Open Paystack checkout'}
                </AppText>
              )}
            </TouchableOpacity>
          ) : null}

          {Platform.OS === 'ios' ? (
            <AppText style={styles.platformNote}>
              iOS will use the standard Paystack checkout until the iOS native Paystack bridge is added.
            </AppText>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 26, 61, 0.55)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  brandIcon: {
    alignItems: 'center',
    backgroundColor: '#0A66C2',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerCopy: { flex: 1 },
  title: { fontFamily: typography.bold, color: '#071A3D', fontSize: 20 },
  subtitle: { color: '#64748b', fontSize: 13, lineHeight: 18, marginTop: 3 },
  closeButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  amountCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 13,
  },
  amountLabel: { color: '#2563eb', fontSize: 13, fontWeight: '700' },
  amountValue: { fontFamily: typography.bold, color: '#071A3D', fontSize: 20, marginTop: 3 },
  nativeCard: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  nativeTitle: { fontFamily: typography.bold, color: '#071A3D', fontSize: 16, marginTop: 8 },
  nativeText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#0A66C2',
    borderRadius: 14,
    marginTop: 14,
    paddingVertical: 14,
  },
  primaryText: { fontFamily: typography.bold, color: '#ffffff', fontSize: 16 },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#0A66C2',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 13,
  },
  secondaryText: { fontFamily: typography.bold, color: '#0A66C2', fontSize: 14 },
  fallbackCard: {
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  fallbackTitle: { fontFamily: typography.bold, color: '#1e3a8a', fontSize: 14 },
  fallbackText: { color: '#475569', fontSize: 13, lineHeight: 18 },
  platformNote: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  disabled: { opacity: 0.65 },
});

export default NativePaystackCardModal;
