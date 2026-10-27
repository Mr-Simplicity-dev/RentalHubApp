import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useRef, useState } from 'react';
import {StyleSheet} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
} from '../../components/common/PremiumLayout';
import TurnstileWidget from '../../components/common/TurnstileWidget';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/http';
import { colors, typography, typeScale } from '../../theme';
import AppText from '../../components/common/AppText';

const ResetPasswordScreen = ({ navigation, route }) => {
  useInterfaceLanguage();
  const token = route?.params?.token || route?.params?.resetToken || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const turnstileTokenRef = useRef(null);
  const turnstileRef = useRef(null);

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      Toast.show({ type: 'error', text1: ui("Password must be at least 6 characters") });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: ui("Passwords do not match") });
      return;
    }
    if (!token) {
      Toast.show({ type: 'error', text1: ui("Invalid reset link") });
      return;
    }

    const turnstileToken = turnstileTokenRef.current;
    if (!turnstileToken) {
      Toast.show({ type: 'error', text1: ui("Security Check"), text2: ui("Please complete the security check below.") });
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password, turnstileToken);
      Toast.show({ type: 'success', text1: ui("Password reset successfully") });
      navigation.navigate('Login');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not reset password'),
      });
      turnstileRef.current?.reset();
      turnstileTokenRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow={ui("Secure access")}
        title={ui("Create a fresh password")}
        subtitle={ui("Choose a strong password so your RentalHub wallet, bookings and property records stay protected.")}
        icon="key-outline"
      />

      <PremiumCard>
        <Input
          label={ui("New password")}
          value={password}
          onChangeText={setPassword}
          placeholder={ui("Minimum 6 characters")}
          secureTextEntry
          autoCapitalize="none"
          icon="lock-closed-outline"
        />
        <Input
          label={ui("Confirm password")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={ui("Re-enter password")}
          secureTextEntry
          autoCapitalize="none"
          icon="lock-closed-outline"
        />

        <PremiumButton
          title={ui("Reset password")}
          onPress={handleSubmit}
          loading={loading}
          icon="checkmark-circle-outline"
        />

        <TurnstileWidget
        action="rentalhub_reset_password"
          ref={turnstileRef}
          onToken={(token) => { turnstileTokenRef.current = token; }}
          onExpire={() => { turnstileTokenRef.current = null; }}
          onError={() => { turnstileTokenRef.current = null; }}
        />

        <AppText style={styles.helper}>{ui("After reset, sign in again with your new password.")}</AppText>
      </PremiumCard>
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  helper: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
});

export default ResetPasswordScreen;
