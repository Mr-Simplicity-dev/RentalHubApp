import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/http';

const AcceptLawyerInviteScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    token: route?.params?.token || '',
    full_name: '',
    phone: '',
    password: '',
    confirm_password: '',
  });

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAcceptInvite = async () => {
    if (!form.token.trim() || !form.full_name.trim() || !form.phone.trim() || !form.password) {
      Toast.show({ type: 'error', text1: 'Complete all required fields' });
      return;
    }

    if (form.password !== form.confirm_password) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }

    if (form.password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.acceptLawyerInvite({
        token: form.token.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Invite accepted',
          text2: 'You can now sign in as a lawyer.',
        });
        navigation.navigate('Login');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: response.message || 'Could not accept invite',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not accept invite'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Accept Lawyer Invite</Text>
      <Text style={styles.subtitle}>
        Paste your invitation token and set your profile/password to activate the account.
      </Text>

      <Input
        label="Invite Token"
        value={form.token}
        onChangeText={(value) => onChange('token', value)}
        placeholder="Token from email"
      />
      <Input
        label="Full Name"
        value={form.full_name}
        onChangeText={(value) => onChange('full_name', value)}
        placeholder="Your full name"
      />
      <Input
        label="Phone"
        value={form.phone}
        onChangeText={(value) => onChange('phone', value)}
        placeholder="+234..."
        keyboardType="phone-pad"
      />
      <Input
        label="Password"
        value={form.password}
        onChangeText={(value) => onChange('password', value)}
        placeholder="At least 8 characters"
        secureTextEntry
      />
      <Input
        label="Confirm Password"
        value={form.confirm_password}
        onChangeText={(value) => onChange('confirm_password', value)}
        placeholder="Repeat password"
        secureTextEntry
      />

      <Button title="Activate Lawyer Account" onPress={handleAcceptInvite} loading={loading} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 8, marginBottom: 18, color: '#64748b', lineHeight: 20 },
});

export default AcceptLawyerInviteScreen;
