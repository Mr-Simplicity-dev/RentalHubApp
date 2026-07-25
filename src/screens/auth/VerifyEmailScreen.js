import React, { useEffect, useState } from 'react';
import {StyleSheet} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
} from '../../components/common/PremiumLayout';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/http';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const VerifyEmailScreen = ({ navigation, route }) => {
  const [token, setToken] = useState(route?.params?.token || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const verifyEmail = async (nextToken = token) => {
    if (!nextToken) {
      Toast.show({ type: 'error', text1: 'Verification token is required' });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyEmail(nextToken);
      setMessage(response?.message || 'Email verified successfully.');
      Toast.show({ type: 'success', text1: 'Email verified' });
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not verify email'));
      Toast.show({
        type: 'error',
        text1: 'Email verification failed',
        text2: getErrorMessage(error, 'Could not verify email'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (route?.params?.token) {
      verifyEmail(route.params.token);
    }
  }, [route?.params?.token]);

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow="Email security"
        title="Verify your email"
        subtitle="Confirm your email to unlock safer payments, applications and account recovery."
        icon="mail-open-outline"
      />

      <PremiumCard>
        <Input
          label="Email verification token"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="Paste token"
          icon="ticket-outline"
        />

        {message ? <AppText style={styles.message}>{message}</AppText> : null}

        <PremiumButton
          title="Verify email"
          onPress={() => verifyEmail()}
          loading={loading}
          icon="shield-checkmark-outline"
        />
        {navigation.canGoBack() ? (
          <PremiumButton
            title="Done"
            variant="secondary"
            onPress={() => navigation.goBack()}
            icon="arrow-back-outline"
            style={styles.marginTop}
          />
        ) : null}
      </PremiumCard>
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  message: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  marginTop: {
    marginTop: 10,
  },
});

export default VerifyEmailScreen;
