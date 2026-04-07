import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/http';

const AcceptAgentInviteScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    token: route?.params?.token || '',
    full_name: '',
    phone: '',
    password: '',
  });

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async () => {
    if (!form.token || !form.full_name || !form.phone || !form.password) {
      Toast.show({ type: 'error', text1: 'All fields are required' });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.acceptAgentInvite(form);
      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Invite accepted', text2: 'You can now sign in as an agent.' });
        navigation.navigate('Login');
      } else {
        Toast.show({ type: 'error', text1: 'Failed', text2: response?.message || 'Invite acceptance failed' });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not accept agent invite'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Accept Agent Invite</Text>
      <Text style={styles.subtitle}>Complete your delegated agent account setup</Text>

      <Input label="Invite Token" value={form.token} onChangeText={(value) => onChange('token', value)} />
      <Input label="Full Name" value={form.full_name} onChangeText={(value) => onChange('full_name', value)} />
      <Input
        label="Phone"
        value={form.phone}
        onChangeText={(value) => onChange('phone', value)}
        keyboardType="phone-pad"
      />
      <Input
        label="Password"
        value={form.password}
        onChangeText={(value) => onChange('password', value)}
        secureTextEntry
      />

      <Button title="Accept Invite" onPress={onSubmit} loading={loading} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#64748b' },
});

export default AcceptAgentInviteScreen;
