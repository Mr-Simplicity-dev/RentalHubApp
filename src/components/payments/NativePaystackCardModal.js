import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Close payment" onPress={onCancel} style={styles.closeButton}>
              <Icon name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {amountLabel ? (
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Amount</Text>
              <Text style={styles.amountValue}>{amountLabel}</Text>
            </View>
          ) : null}

          {nativeAvailable ? (
            <View style={styles.nativeCard}>
              <Icon name="phone-portrait-outline" size={26} color="#0A66C2" />
              <Text style={styles.nativeTitle}>Use native Paystack checkout</Text>
              <Text style={styles.nativeText}>
                Paystack will open a secure in-app payment sheet. RentalHub does not collect or store your card details.
              </Text>
              <TouchableOpacity
                disabled={launching || fallbackLoading}
                onPress={handleNativeCheckout}
                style={[styles.primaryButton, (launching || fallbackLoading) && styles.disabled]}>
                {launching ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryText}>Continue securely</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fallbackCard}>
              <Icon name="information-circle-outline" size={22} color="#0A66C2" />
              <Text style={styles.fallbackTitle}>Native Paystack sheet is not active here</Text>
              <Text style={styles.fallbackText}>
                {nativeStatus.reason || 'Use Paystack checkout to complete this payment.'}
              </Text>
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
                <Text style={styles.secondaryText}>
                  {nativeAvailable ? 'Use Paystack browser checkout instead' : 'Open Paystack checkout'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          {Platform.OS === 'ios' ? (
            <Text style={styles.platformNote}>
              iOS will use the standard Paystack checkout until the iOS native Paystack bridge is added.
            </Text>
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
  title: { color: '#071A3D', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 3 },
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
  amountLabel: { color: '#2563eb', fontSize: 11, fontWeight: '700' },
  amountValue: { color: '#071A3D', fontSize: 21, fontWeight: '900', marginTop: 3 },
  nativeCard: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  nativeTitle: { color: '#071A3D', fontSize: 16, fontWeight: '800', marginTop: 8 },
  nativeText: {
    color: '#475569',
    fontSize: 12,
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
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#0A66C2',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 13,
  },
  secondaryText: { color: '#0A66C2', fontSize: 14, fontWeight: '800' },
  fallbackCard: {
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  fallbackTitle: { color: '#1e3a8a', fontSize: 14, fontWeight: '800' },
  fallbackText: { color: '#475569', fontSize: 12, lineHeight: 18 },
  platformNote: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  disabled: { opacity: 0.65 },
});

export default NativePaystackCardModal;
