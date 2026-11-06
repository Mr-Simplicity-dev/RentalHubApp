import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from './common/AppText';
import Input from './common/Input';
import Button from './common/Button';
import api from '../services/api';
import { getErrorMessage } from '../utils/http';
import { colors, typography } from '../theme';
import { translateUi as ui } from '../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../i18n/useInterfaceLanguage';
const phoneCopy = require('../i18n/registrationPhoneCopy.cjs');

const options = { skipAuth: true, skipAuthRefresh: true };
export default function RegistrationPhoneVerification({ pending, onVerified, onClose }) {
  const language = useInterfaceLanguage();
  const copy = { ...phoneCopy.en, ...phoneCopy[language] };
  const [challenge, setChallenge] = useState(pending.challenge);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(!pending.reference);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(pending.reference ? 0 : 60);
  const initialSend = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const resend = async () => {
    if (inFlight.current || cooldown > 0) return;
    inFlight.current = true; setBusy(true); setSent(false); setError('');
    try {
      if (pending.reference) {
        await api.post(`/auth/register/payment/otp/${pending.reference}`, {}, options);
      } else {
        const response = await api.post('/auth/register/phone/resend', { ...pending.payload, phone_challenge: challenge, registration_flow: pending.flow }, options);
        if (mounted.current) setChallenge(response.data.data.phone_challenge);
      }
      if (mounted.current) { setSent(true); setCode(''); setCooldown(60); }
    } catch (err) { if (mounted.current) setError(getErrorMessage(err, 'Could not send the verification code. Please try again.')); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  useEffect(() => {
    if (pending.reference && !initialSend.current) { initialSend.current = true; resend(); }
  }, []);
  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const verify = async () => {
    if (inFlight.current || code.length !== 6) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const response = pending.reference
        ? await api.post(`/auth/register/payment/complete/${pending.reference}`, { otp: code }, options)
        : await api.post(pending.flow === 'free' ? '/auth/register/verify-phone' : '/auth/register/payment/verify-phone', { ...pending.payload, phone_challenge: challenge, otp: code }, options);
      if (!response.data.success) throw new Error(response.data.message || 'Verification failed');
      if (mounted.current) await onVerified(response.data.data);
    } catch (err) { if (mounted.current) setError(getErrorMessage(err, 'Could not verify your code. Please try again.')); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={styles.backdrop}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
          <AppText accessibilityRole="header" style={styles.title}>{copy.title}</AppText>
          <AppText style={styles.copy}>{sent ? pending.flow === 'paid' ? copy.body : copy.freeBody : busy ? copy.sending : copy.failed}</AppText>
          <Input label={ui('Verification code')} value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" textContentType="oneTimeCode" editable={!busy} />
          {error ? <AppText accessibilityLiveRegion="polite" style={styles.error}>{error}</AppText> : null}
          <Button title={pending.reference || pending.flow === 'free' ? copy.complete : copy.payment} onPress={verify} loading={busy} disabled={busy || !sent || code.length !== 6} />
          <Button title={cooldown ? copy.cooldown.replace('{value0}', cooldown) : copy.resend} onPress={resend} disabled={busy || cooldown > 0} variant="outline" />
          <Button title={copy.back} onPress={onClose} disabled={busy} variant="outline" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  center: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { alignSelf: 'center', width: '100%', maxWidth: 440, maxHeight: '95%', borderRadius: 20, backgroundColor: colors.white },
  cardContent: { padding: 20, gap: 12 },
  title: { textAlign: 'center', fontSize: 22, fontFamily: typography.bold, color: colors.navy },
  copy: { textAlign: 'center', color: colors.navy },
  error: { color: '#b91c1c', textAlign: 'center' },
});
