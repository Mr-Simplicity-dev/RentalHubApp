import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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
import { colors, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const VerifyEmailScreen = ({ navigation, route }) => {
  useInterfaceLanguage();
  const [token, setToken] = useState(route?.params?.token || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const verifyEmail = async (nextToken = token) => {
    if (!nextToken) {
      Toast.show({ type: 'error', text1: ui("Verification token is required") });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyEmail(nextToken);
      setMessage(response?.message || 'Email verified successfully.');
      Toast.show({ type: 'success', text1: ui("Email verified") });
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not verify email'));
      Toast.show({
        type: 'error',
        text1: ui("Email verification failed"),
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
        eyebrow={ui("Email security")}
        title={ui("Verify your email")}
        subtitle={ui("Confirm your email to unlock safer payments, applications and account recovery.")}
        icon="mail-open-outline"
      />

      <PremiumCard>
        <Input
          label={ui("Email verification token")}
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder={ui("Paste token")}
          icon="ticket-outline"
        />

        {message ? <AppText style={styles.message}>{message}</AppText> : null}

        <PremiumButton
          title={ui("Verify email")}
          onPress={() => verifyEmail()}
          loading={loading}
          icon="shield-checkmark-outline"
        />
        {navigation.canGoBack() ? (
          <PremiumButton
            title={ui("Done")}
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
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginBottom: 14,
  },
  marginTop: {
    marginTop: 10,
  },
});

export default VerifyEmailScreen;
