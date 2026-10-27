import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
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

const VerifyPhoneScreen = ({ navigation }) => {
  useInterfaceLanguage();
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async () => {
    setSending(true);
    try {
      const response = await authService.sendPhoneOTP();
      Toast.show({
        type: 'success',
        text1: ui("OTP sent"),
        text2: response?.message || ui("Check your phone for the verification code."),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not send OTP"),
        text2: getErrorMessage(error, 'Try again later'),
      });
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      Toast.show({ type: 'error', text1: ui("Enter the OTP sent to your phone") });
      return;
    }

    setVerifying(true);
    try {
      const response = await authService.verifyPhone(otp.trim());
      Toast.show({
        type: 'success',
        text1: ui("Phone verified"),
        text2: response?.message || ui("Your phone number has been verified."),
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Phone verification failed"),
        text2: getErrorMessage(error, 'Check the OTP and try again'),
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow={ui("Phone security")}
        title={ui("Verify your mobile number")}
        subtitle={ui("Use a one-time code to protect bookings, calls and payment alerts on your account.")}
        icon="phone-portrait-outline"
      />

      <PremiumCard>
        <PremiumButton
          title={ui("Send OTP")}
          onPress={sendOtp}
          loading={sending}
          variant="secondary"
          icon="chatbubble-ellipses-outline"
        />

        <Input
          label={ui("OTP code")}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          placeholder={ui("Enter code")}
          icon="keypad-outline"
          containerStyle={styles.inputGap}
        />

        <PremiumButton
          title={ui("Verify phone")}
          onPress={verifyOtp}
          loading={verifying}
          icon="checkmark-circle-outline"
        />
      </PremiumCard>
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  inputGap: {
    marginTop: 18,
  },
});

export default VerifyPhoneScreen;
