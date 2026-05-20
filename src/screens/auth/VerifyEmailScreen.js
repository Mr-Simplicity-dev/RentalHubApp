import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/http';

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>
          Paste the verification token from your email if it was not opened automatically.
        </Text>

        <Input
          label="Email verification token"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="Paste token"
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Button title="Verify Email" onPress={() => verifyEmail()} loading={loading} />
        {navigation.canGoBack() ? (
          <Button
            title="Done"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.marginTop}
          />
        ) : null}
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
  message: { color: '#334155', marginBottom: 12 },
  marginTop: { marginTop: 10 },
});

export default VerifyEmailScreen;
