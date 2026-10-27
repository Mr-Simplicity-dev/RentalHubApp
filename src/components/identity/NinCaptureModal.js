import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useContext, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import TextInput from '../common/AppTextInput';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';

// Mandatory NIN capture shown to users who registered before NIN was required.
// No skip/back — the user must submit an 11-digit NIN (verified via Prembly)
// before they can continue using the app.
const NinCaptureModal = () => {
  useInterfaceLanguage();
  const { user, updateUser } = useContext(AuthContext);
  const [nin, setNin] = useState('');
  const [dob, setDob] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const needsNIN =
    user?.identity_document_type === 'nin' &&
    !user?.nin &&
    !user?.nin_verified;

  if (!needsNIN) return null;

  const handleSubmit = async () => {
    if (!/^\d{11}$/.test(nin.trim())) {
      setError('Enter your 11-digit NIN');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      setError('Enter your date of birth as YYYY-MM-DD');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const response = await userService.addNin({
        nin: nin.trim(),
        date_of_birth: dob.trim(),
      });
      if (response?.success) {
        await updateUser({
          ...user,
          nin_verified: true,
          identity_verified: response.identity_verified ?? user.identity_verified,
        });
        Toast.show({ type: 'success', text1: ui("NIN verified"), text2: ui("Your identity has been updated.") });
      } else {
        setError(response?.message || 'Could not verify your NIN');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not verify your NIN.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <AppText style={styles.icon}>🪪</AppText>
          </View>
          <AppText style={styles.title}>{ui("Add your NIN")}</AppText>
          <AppText style={styles.subtitle}>{ui("Your account was created before NIN was required. Enter your 11-digit NIN and date of birth to complete identity verification.")}</AppText>

          <AppText style={styles.label}>{ui("NIN")}</AppText>
          <TextInput
            style={styles.input}
            value={nin}
            onChangeText={(value) => { setNin(value.replace(/[^0-9]/g, '').slice(0, 11)); setError(''); }}
            placeholder={ui("11-digit NIN")}
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={11}
          />

          <AppText style={styles.label}>{ui("Date of birth")}</AppText>
          <TextInput
            style={styles.input}
            value={dob}
            onChangeText={(value) => { setDob(value.trim()); setError(''); }}
            placeholder={ui("YYYY-MM-DD")}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <View style={styles.submitButton}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <AppText style={styles.submitText} onPress={handleSubmit}>{ui("Verify NIN")}</AppText>
            )}
          </View>
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
  icon: { fontSize: 28 },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 14,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  label: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 20,
    minHeight: 52,
  },
  submitText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.base,
    lineHeight: 24,
  },
});

export default NinCaptureModal;
