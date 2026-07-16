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
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async () => {
    setSending(true);
    try {
      const response = await authService.sendPhoneOTP();
      Toast.show({
        type: 'success',
        text1: 'OTP sent',
        text2: response?.message || 'Check your phone for the verification code.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not send OTP',
        text2: getErrorMessage(error, 'Try again later'),
      });
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      Toast.show({ type: 'error', text1: 'Enter the OTP sent to your phone' });
      return;
    }

    setVerifying(true);
    try {
      const response = await authService.verifyPhone(otp.trim());
      Toast.show({
        type: 'success',
        text1: 'Phone verified',
        text2: response?.message || 'Your phone number has been verified.',
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Phone verification failed',
        text2: getErrorMessage(error, 'Check the OTP and try again'),
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow="Phone security"
        title="Verify your mobile number"
        subtitle="Use a one-time code to protect bookings, calls and payment alerts on your account."
        icon="phone-portrait-outline"
      />

      <PremiumCard>
        <PremiumButton
          title="Send OTP"
          onPress={sendOtp}
          loading={sending}
          variant="secondary"
          icon="chatbubble-ellipses-outline"
        />

        <Input
          label="OTP code"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          placeholder="Enter code"
          icon="keypad-outline"
          containerStyle={styles.inputGap}
        />

        <PremiumButton
          title="Verify phone"
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
