import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { rentHelpService } from '../../services/rentHelpService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickObject } from '../../utils/http';

import AppText from '../../components/common/AppText';

const money = (amount) =>
  `₦${Number(amount || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-NG');
};

const PayRentOnBehalfScreen = ({ route, navigation }) => {
  const token = route?.params?.token;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await rentHelpService.getRentRequest(token);
      setInfo(pickObject(response, ['data']));
    } catch (err) {
      setError(getErrorMessage(err, 'This rent payment link could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const pay = async (method) => {
    if (!confirmed) {
      Toast.show({ type: 'error', text1: 'Please confirm who you are paying for' });
      return;
    }
    setBusy(method);
    setBankDetails(null);
    try {
      const response = await rentHelpService.payOnBehalf(token, { paymentMethod: method, beneficiaryConfirm: true });
      const data = pickObject(response, ['data']) || {};
      if (method === 'bank_transfer') {
        setBankDetails(data);
      } else if (data.authorization_url) {
        await Linking.openURL(data.authorization_url);
      } else {
        Toast.show({ type: 'error', text1: 'Payment could not be started. Please try again.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Payment failed', text2: getErrorMessage(err, 'Please try again.') });
    } finally {
      setBusy('');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Icon name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Pay someone's rent</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}>
          <Icon name="hand-left-outline" size={26} color="#0F766E" />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} size="large" />
            <AppText style={styles.loadingText}>Loading payment link…</AppText>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Icon name="close-circle" size={34} color={colors.danger} />
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        ) : (
          <>
            <AppText style={styles.lead}>
              You are about to pay rent on behalf of <AppText style={styles.leadStrong}>{info?.tenant_name || 'a tenant'}</AppText>.
            </AppText>

            <View style={styles.amountCard}>
              <AppText style={styles.amountLabel}>Amount due (server-confirmed)</AppText>
              <AppText style={styles.amountValue}>{money(info?.amount)}</AppText>
              <AppText style={styles.expiresText}>Link expires {formatDateTime(info?.expires_at)}</AppText>
              <View style={styles.noteBox}>
                <AppText style={styles.noteText}>
                  The rent is credited to the tenant's property. You will get a receipt and the tenant will be notified.
                </AppText>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
              onPress={() => setConfirmed((current) => !current)}
              style={styles.consentRow}
            >
              <Icon name={confirmed ? 'checkbox' : 'square-outline'} size={22} color={confirmed ? '#0F766E' : colors.muted} />
              <AppText style={styles.consentText}>
                I confirm I am paying {money(info?.amount)} for {info?.tenant_name || 'this tenant'}. I understand this payment is credited to them and cannot be reversed.
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={busy !== '' || !confirmed}
              onPress={() => pay('paystack')}
              style={[styles.cardButton, (busy !== '' || !confirmed) && styles.buttonDisabled]}
            >
              {busy === 'paystack' ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Icon name="card-outline" size={18} color={colors.white} />
                  <AppText style={styles.cardButtonText}>Pay now with card</AppText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={busy !== '' || !confirmed}
              onPress={() => pay('bank_transfer')}
              style={[styles.bankButton, (busy !== '' || !confirmed) && styles.buttonDisabled]}
            >
              {busy === 'bank_transfer' ? (
                <ActivityIndicator color={colors.ink} size="small" />
              ) : (
                <>
                  <Icon name="business-outline" size={18} color={colors.ink} />
                  <AppText style={styles.bankButtonText}>Pay by bank transfer</AppText>
                </>
              )}
            </TouchableOpacity>

            {bankDetails ? (
              <View style={styles.bankCard}>
                <AppText style={styles.bankCardLabel}>TRANSFER TO THIS ACCOUNT</AppText>
                <AppText style={styles.bankLine}>{bankDetails.bank_name} · {bankDetails.account_number}</AppText>
                <AppText style={styles.bankLine}>{bankDetails.account_name}</AppText>
                <AppText style={styles.bankAmount}>Amount: {money(bankDetails.amount)}</AppText>
                <AppText style={styles.bankReference}>Use reference {bankDetails.reference} so we can match the payment.</AppText>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerBack: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  headerTitle: { color: colors.ink, flex: 1, fontFamily: typography.bold, fontSize: 17, textAlign: 'center' },
  headerSpacer: { height: 36, width: 36 },
  content: { padding: 18, paddingBottom: 32 },
  heroIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#CCFBF1',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { color: colors.muted, fontFamily: typography.medium, fontSize: 13, marginTop: 12 },
  errorText: { color: colors.danger, fontFamily: typography.regular, fontSize: 14, marginTop: 12, textAlign: 'center' },
  lead: { color: colors.text, fontFamily: typography.regular, fontSize: 14, lineHeight: 20, marginTop: 18, textAlign: 'center' },
  leadStrong: { color: colors.ink, fontFamily: typography.bold },
  amountCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  amountLabel: { color: colors.muted, fontFamily: typography.regular, fontSize: 12 },
  amountValue: { color: colors.ink, fontFamily: typography.bold, fontSize: 26, marginTop: 4 },
  expiresText: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, marginTop: 6 },
  noteBox: { backgroundColor: '#F0FDFA', borderRadius: radius.sm, marginTop: 12, padding: 10 },
  noteText: { color: '#0F766E', fontFamily: typography.regular, fontSize: 12, lineHeight: 17 },
  consentRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
    padding: 13,
  },
  consentText: { color: colors.text, flex: 1, fontFamily: typography.regular, fontSize: 12, lineHeight: 18 },
  cardButton: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  cardButtonText: { color: colors.white, fontFamily: typography.semibold, fontSize: 14 },
  bankButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
  },
  bankButtonText: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14 },
  buttonDisabled: { opacity: 0.5 },
  bankCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  bankCardLabel: { color: '#047857', fontFamily: typography.bold, fontSize: 11, letterSpacing: 0.6 },
  bankLine: { color: colors.ink, fontFamily: typography.semibold, fontSize: 14, marginTop: 7 },
  bankAmount: { color: colors.text, fontFamily: typography.regular, fontSize: 13, marginTop: 8 },
  bankReference: { color: colors.muted, fontFamily: typography.regular, fontSize: 12, marginTop: 6 },
});

export default PayRentOnBehalfScreen;
