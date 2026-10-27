import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
} from '../../components/common/PremiumLayout';
import TurnstileWidget from '../../components/common/TurnstileWidget';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/http';

const AcceptAgentInviteScreen = ({ navigation, route }) => {
  useInterfaceLanguage();
  const [loading, setLoading] = useState(false);
  const turnstileTokenRef = useRef(null);
  const turnstileRef = useRef(null);
  const [form, setForm] = useState({
    token: route?.params?.token || '',
    full_name: '',
    phone: '',
    password: '',
  });

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async () => {
    if (!form.token || !form.full_name || !form.phone || !form.password) {
      Toast.show({ type: 'error', text1: ui("All fields are required") });
      return;
    }

    const turnstileToken = turnstileTokenRef.current;
    if (!turnstileToken) {
      Toast.show({ type: 'error', text1: ui("Security Check"), text2: ui("Please complete the security check below.") });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.acceptAgentInvite(form, turnstileToken);
      if (response?.success) {
        Toast.show({ type: 'success', text1: ui("Invite accepted"), text2: ui("You can now sign in as an agent.") });
        navigation.navigate('Login');
      } else {
        Toast.show({ type: 'error', text1: ui("Failed"), text2: response?.message || ui("Invite acceptance failed") });
        turnstileRef.current?.reset();
        turnstileTokenRef.current = null;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, 'Could not accept agent invite'),
      });
      turnstileRef.current?.reset();
      turnstileTokenRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow={ui("Agent onboarding")}
        title={ui("Activate your agent profile")}
        subtitle={ui("Complete your delegated access setup and start managing assigned RentalHub work from mobile.")}
        icon="briefcase-outline"
      />

      <PremiumCard>
        <Input
          label={ui("Invite token")}
          value={form.token}
          onChangeText={(value) => onChange('token', value)}
          icon="ticket-outline"
        />
        <Input
          label={ui("Full name")}
          value={form.full_name}
          onChangeText={(value) => onChange('full_name', value)}
          icon="person-outline"
        />
        <Input
          label={ui("Phone")}
          value={form.phone}
          onChangeText={(value) => onChange('phone', value)}
          keyboardType="phone-pad"
          icon="call-outline"
        />
        <Input
          label={ui("Password")}
          value={form.password}
          onChangeText={(value) => onChange('password', value)}
          secureTextEntry
          icon="lock-closed-outline"
        />

        <PremiumButton
          title={ui("Accept invite")}
          onPress={onSubmit}
          loading={loading}
          icon="checkmark-circle-outline"
        />

        <TurnstileWidget
        action="rentalhub_agent_invite"
          ref={turnstileRef}
          onToken={(token) => { turnstileTokenRef.current = token; }}
          onExpire={() => { turnstileTokenRef.current = null; }}
          onError={() => { turnstileTokenRef.current = null; }}
        />
      </PremiumCard>
    </PremiumScreen>
  );
};

export default AcceptAgentInviteScreen;
