import React, { useEffect, useState } from 'react';
import {Modal, StyleSheet, TextInput, View} from 'react-native';
import {
  cancelMfaChallenge,
  getMfaState,
  submitMfaCode,
  subscribeMfaChallenge,
} from '../../services/mfaPromptService';
import {colors, radius, typography} from '../../theme';
import AppText from '../../components/common/AppText';
import Button from '../../components/common/Button';

// Shown when the server answers 403 MFA_REQUIRED: privileged dashboards need a
// fresh 6-digit TOTP code before they will hand over data.
const MfaCodeModal = () => {
  const [challenge, setChallenge] = useState(getMfaState());
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => subscribeMfaChallenge(setChallenge), []);

  useEffect(() => {
    if (!challenge.visible) {
      setCode('');
      setSubmitting(false);
    }
  }, [challenge.visible]);

  const handleSubmit = () => {
    const value = code.trim();
    if (value.length !== 6) return;
    setSubmitting(true);
    submitMfaCode(value);
  };

  if (!challenge.visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={cancelMfaChallenge}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <AppText style={styles.icon}>🔐</AppText>
          </View>
          <AppText style={styles.title}>Two-factor check</AppText>
          <AppText style={styles.subtitle}>
            This screen is protected by two-factor authentication. Enter the 6-digit code from your
            authenticator app (e.g. Google Authenticator) to unlock it.
          </AppText>

          <AppText style={styles.label}>6-digit code</AppText>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(value) => {
              setCode(value.replace(/[^0-9]/g, '').slice(0, 6));
            }}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          {challenge.attempt > 1 ? (
            <AppText style={styles.error}>
              That code was not accepted. Codes change every 30 seconds, so try the next one.
            </AppText>
          ) : null}

          <Button
            title="Unlock"
            onPress={handleSubmit}
            loading={submitting}
            disabled={code.trim().length !== 6}
            style={styles.submitButton}
          />
          <Button title="Not now" variant="outline" onPress={cancelMfaChallenge} style={styles.cancelButton} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 26, 61, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 34,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceBlue,
    alignSelf: 'center',
  },
  icon: {fontSize: 28},
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 22,
    textAlign: 'center',
    marginTop: 14,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  label: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.ink,
    fontFamily: typography.medium,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 10,
  },
  submitButton: {
    marginTop: 18,
  },
  cancelButton: {
    marginTop: 10,
  },
});

export default MfaCodeModal;
