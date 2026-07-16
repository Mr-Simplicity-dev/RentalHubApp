import React, { useState } from 'react';
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
    <PremiumScreen>
      <PremiumHero
        eyebrow="Agent onboarding"
        title="Activate your agent profile"
        subtitle="Complete your delegated access setup and start managing assigned RentalHub work from mobile."
        icon="briefcase-outline"
      />

      <PremiumCard>
        <Input
          label="Invite token"
          value={form.token}
          onChangeText={(value) => onChange('token', value)}
          icon="ticket-outline"
        />
        <Input
          label="Full name"
          value={form.full_name}
          onChangeText={(value) => onChange('full_name', value)}
          icon="person-outline"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(value) => onChange('phone', value)}
          keyboardType="phone-pad"
          icon="call-outline"
        />
        <Input
          label="Password"
          value={form.password}
          onChangeText={(value) => onChange('password', value)}
          secureTextEntry
          icon="lock-closed-outline"
        />

        <PremiumButton
          title="Accept invite"
          onPress={onSubmit}
          loading={loading}
          icon="checkmark-circle-outline"
        />
      </PremiumCard>
    </PremiumScreen>
  );
};

export default AcceptAgentInviteScreen;
