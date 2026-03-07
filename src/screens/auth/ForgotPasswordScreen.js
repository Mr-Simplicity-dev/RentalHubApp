import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/http';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email required',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your email to receive a reset link.</Text>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        icon="mail-outline"
      />

      <Button title="Send Reset Link" onPress={handleSubmit} loading={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff', padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 8, marginBottom: 18, color: '#64748b' },
});

export default ForgotPasswordScreen;
