import React, { useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import AppText from './AppText';
import Input from './Input';
import Button from './Button';
import { useLanguage } from '../../context/LanguageContext';
import copy from '../../i18n/assistedRegistration.json';
import TurnstileWidget from './TurnstileWidget';
export default function PhoneAccountAccess() {
  const {
    language
  } = useLanguage();
  const c = copy[language] || copy.en;
  const {
    establishSession,
    updateUser
  } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState('');
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
          phone,
          turnstile_token: token.current
        });
        setChallenge(r.data.data.challenge_id);
        setMessage(r.data.data.message);
        token.current = null;
        widget.current?.reset();
      } else {
        const r = await api.post('/assisted-registration/phone/verify', {
          challenge_id: challenge,
          code
        });
        await establishSession(r.data.data);
        const me = await api.get('/auth/me');
        await updateUser(me.data.data);
      }
    } catch (e) {
      setMessage(e.response?.data?.message || e.message || 'Unable to continue.');
    } finally {
      setBusy(false);
    }
  };
  return <View style={{
    marginTop: 20,
    gap: 12
  }}><Button title={open ? c.closePhone : c.phoneTitle} variant="outline" onPress={() => setOpen(!open)} />{open && <><AppText>{c.phoneHelp}</AppText><Input label={c.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!challenge} />{challenge ? <Input label={c.code} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="sms-otp" /> : <TurnstileWidget ref={widget} action="rentalhub_login" onToken={v => {
        token.current = v;
      }} onExpire={() => {
        token.current = null;
      }} onError={() => {
        token.current = null;
      }} />}{message ? <AppText accessibilityLiveRegion="polite">{message}</AppText> : null}<Button title={challenge ? c.verify : c.send} loading={busy} onPress={submit} />{challenge && <Button variant="outline" title={c.change} onPress={() => {
        setChallenge('');
        setCode('');
      }} />}</>}</View>;
}
