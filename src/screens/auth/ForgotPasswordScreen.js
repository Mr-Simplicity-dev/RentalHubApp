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
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const turnstileTokenRef = useRef(null);
  const turnstileRef = useRef(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email required',
      });
      return;
    }

    const turnstileToken = turnstileTokenRef.current;
    if (!turnstileToken) {
      Toast.show({ type: 'error', text1: 'Security Check', text2: 'Please complete the security check below.' });
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim(), turnstileToken);
      Toast.show({
        type: 'success',
        text1: 'Request sent',
        text2: 'Check your email for reset instructions.',
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not request password reset'),
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
        eyebrow="Account recovery"
        title="Reset your password securely"
        subtitle="Enter the email linked to your RentalHub account and we will send you the next step."
        icon="shield-checkmark-outline"
      />

      <PremiumCard>
        <Input
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          icon="mail-outline"
        />

        <PremiumButton
          title="Send reset link"
          onPress={handleSubmit}
          loading={loading}
          icon="send-outline"
        />

        <TurnstileWidget
        action="rentalhub_forgot_password"
          ref={turnstileRef}
          onToken={(token) => { turnstileTokenRef.current = token; }}
          onExpire={() => { turnstileTokenRef.current = null; }}
          onError={() => { turnstileTokenRef.current = null; }}
        />

        <AppText style={styles.helper}>
          For your security, reset links are time-sensitive. Use the latest email if you request more than one.
        </AppText>
      </PremiumCard>
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  helper: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;
