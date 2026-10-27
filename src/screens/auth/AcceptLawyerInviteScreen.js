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

const AcceptLawyerInviteScreen = ({ navigation, route }) => {
  useInterfaceLanguage();
  const [loading, setLoading] = useState(false);
  const turnstileTokenRef = useRef(null);
  const turnstileRef = useRef(null);
  const [form, setForm] = useState({
    token: route?.params?.token || '',
    full_name: '',
    chamber_name: '',
    chamber_phone: '',
    phone: '',
    password: '',
    confirm_password: '',
  });

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAcceptInvite = async () => {
    if (
      !form.token.trim() ||
      !form.full_name.trim() ||
      !form.chamber_name.trim() ||
      !form.chamber_phone.trim() ||
      !form.phone.trim() ||
      !form.password
    ) {
      Toast.show({ type: 'error', text1: ui("Complete all required fields") });
      return;
    }

    if (form.password !== form.confirm_password) {
      Toast.show({ type: 'error', text1: ui("Passwords do not match") });
      return;
    }

    if (form.password.length < 8) {
      Toast.show({ type: 'error', text1: ui("Password must be at least 8 characters") });
      return;
    }

    const turnstileToken = turnstileTokenRef.current;
    if (!turnstileToken) {
      Toast.show({ type: 'error', text1: ui("Security Check"), text2: ui("Please complete the security check below.") });
      return;
    }

    setLoading(true);
    try {
      const response = await authService.acceptLawyerInvite({
        token: form.token.trim(),
        full_name: form.full_name.trim(),
        chamber_name: form.chamber_name.trim(),
        chamber_phone: form.chamber_phone.trim(),
        phone: form.phone.trim(),
        password: form.password,
      }, turnstileToken);

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: ui("Invite accepted"),
          text2: ui("You can now sign in as a lawyer."),
        });
        navigation.navigate('Login');
      } else {
        Toast.show({
          type: 'error',
          text1: ui("Failed"),
          text2: response.message || ui("Could not accept invite"),
        });
        turnstileRef.current?.reset();
        turnstileTokenRef.current = null;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
        text2: getErrorMessage(error, ui("Could not accept invite")),
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
        eyebrow={ui("Legal partner")}
        title={ui("Activate lawyer access")}
        subtitle={ui("Set up your verified legal profile for RentalHub agreements, reviews and dispute support.")}
        icon="shield-outline"
      />

      <PremiumCard>
        <Input
          label={ui("Invite token")}
          value={form.token}
          onChangeText={(value) => onChange('token', value)}
          placeholder={ui("Token from email")}
          icon="ticket-outline"
        />
        <Input
          label={ui("Full name")}
          value={form.full_name}
          onChangeText={(value) => onChange('full_name', value)}
          placeholder={ui("Your full name")}
          icon="person-outline"
        />
        <Input
          label={ui("Chamber / law firm name")}
          value={form.chamber_name}
          onChangeText={(value) => onChange('chamber_name', value)}
          placeholder={ui("Your firm or chamber")}
          icon="business-outline"
        />
        <Input
          label={ui("Chamber phone")}
          value={form.chamber_phone}
          onChangeText={(value) => onChange('chamber_phone', value)}
          placeholder="+234..."
          keyboardType="phone-pad"
          icon="call-outline"
        />
        <Input
          label={ui("Phone")}
          value={form.phone}
          onChangeText={(value) => onChange('phone', value)}
          placeholder="+234..."
          keyboardType="phone-pad"
          icon="phone-portrait-outline"
        />
        <Input
          label={ui("Password")}
          value={form.password}
          onChangeText={(value) => onChange('password', value)}
          placeholder={ui("At least 8 characters")}
          secureTextEntry
          icon="lock-closed-outline"
        />
        <Input
          label={ui("Confirm password")}
          value={form.confirm_password}
          onChangeText={(value) => onChange('confirm_password', value)}
          placeholder={ui("Repeat password")}
          secureTextEntry
          icon="lock-closed-outline"
        />

        <PremiumButton
          title={ui("Activate lawyer account")}
          onPress={handleAcceptInvite}
          loading={loading}
          icon="checkmark-circle-outline"
        />

        <TurnstileWidget
        action="rentalhub_lawyer_invite"
          ref={turnstileRef}
          onToken={(token) => { turnstileTokenRef.current = token; }}
          onExpire={() => { turnstileTokenRef.current = null; }}
          onError={() => { turnstileTokenRef.current = null; }}
        />
      </PremiumCard>
    </PremiumScreen>
  );
};

export default AcceptLawyerInviteScreen;
