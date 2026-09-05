import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../common/Input';
import Button from '../common/Button';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../common/AppText';

const WithdrawalFactorModal = ({ method, onVerified, onCancel }) => {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendSmsCode = async () => {
    setSending(true);
    setError('');
    try {
      await authService.sendWithdrawalOtp();
      Toast.show({ type: 'success', text1: 'Code sent', text2: 'A verification code was sent to your phone.' });
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Could not send the code. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (method === 'sms') {
      sendSmsCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  const handleVerify = async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onVerified(code.trim());
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, 'Verification failed. Please try again.'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <AppText style={styles.title}>Security Check</AppText>
            <AppText style={styles.subtitle}>
              Two-factor authentication is required to continue this withdrawal.
            </AppText>
          </View>

          <AppText style={styles.body}>
            {method === 'totp'
              ? 'Enter the 6-digit code from your authenticator app (e.g. Google Authenticator).'
              : 'We sent a verification code to your phone. Enter it below to continue.'}
          </AppText>

          <Input
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, ''));
              setError('');
            }}
            placeholder="••••••"
            keyboardType="number-pad"
            maxLength={6}
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          {method === 'sms' ? (
            <Button
              title={sending ? 'Sending code…' : 'Resend code'}
              variant="outline"
              disabled={sending}
              style={styles.resend}
              onPress={sendSmsCode}
            />
          ) : null}

          <View style={styles.actions}>
            <Button title="Cancel" variant="outline" onPress={onCancel} disabled={busy} style={styles.action} />
            <Button
              title={busy ? 'Verifying…' : 'Verify & Continue'}
              onPress={handleVerify}
              loading={busy}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 26, 61, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  body: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 8,
  },
  resend: {
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  action: {
    flex: 1,
  },
});

export default WithdrawalFactorModal;
