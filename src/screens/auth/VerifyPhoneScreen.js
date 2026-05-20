import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Phone</Text>
        <Text style={styles.subtitle}>
          Request a one-time code, then enter it here to complete phone verification.
        </Text>

        <Button title="Send OTP" onPress={sendOtp} loading={sending} variant="outline" />

        <Input
          label="OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          placeholder="Enter code"
        />

        <Button title="Verify Phone" onPress={verifyOtp} loading={verifying} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { color: '#64748b', marginBottom: 14 },
});

export default VerifyPhoneScreen;
