import React, { useContext, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import copy from '../../i18n/assistedRegistration.json';
import Input from './Input';
import AppText from './AppText';
import Button from './Button';
import TurnstileWidget from './TurnstileWidget';
export default function AssistedPasswordForm() {
  const {
    user,
    logout
  } = useContext(AuthContext);
  const {
    language
  } = useLanguage();
  const c = copy[language] || copy.en;
  const [open, setOpen] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const token = useRef(null);
  const widget = useRef(null);
  const submit = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!challenge) {
        if (!token.current) throw new Error(c.security);
        const r = await api.post('/assisted-registration/phone/request', {
          phone: user.phone,
          purpose: 'recovery',
          turnstile_token: token.current
        });
        setChallenge(r.data.data.challenge_id);
        widget.current?.reset();
        token.current = null;
      } else {
        await api.post('/assisted-registration/password', {
          challenge_id: challenge,
          code,
          password
        });
        setPassword('');
        Alert.alert(c.passwordSaved);
        await logout();
      }
    } catch (e) {
      setMessage(e.response?.data?.message || e.message || c.error);
    } finally {
      setBusy(false);
    }
  };
  if (!user?.assisted_registration) return null;
  return <View style={{
    marginVertical: 18,
    gap: 12
  }}><Button title={c.passwordTitle} variant="outline" onPress={() => setOpen(!open)} />{open && <><AppText>{c.passwordHelp}</AppText>{challenge ? <><Input label={c.code} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" /><Input label={c.newPassword} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" maxLength={128} /></> : <TurnstileWidget ref={widget} action="rentalhub_login" onToken={v => {
        token.current = v;
      }} onExpire={() => {
        token.current = null;
      }} onError={() => {
        token.current = null;
      }} />}{message ? <AppText accessibilityLiveRegion="polite">{message}</AppText> : null}<Button title={challenge ? c.savePassword : c.send} loading={busy} onPress={submit} />{challenge && <Button title={c.change} variant="outline" disabled={busy} onPress={() => {
        setChallenge('');
        setCode('');
        setPassword('');
      }} />}</>}</View>;
}
