import React, { useContext, useState } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../../context/AuthContext';
import api, { API_ORIGIN } from '../../services/api';
import Button from '../common/Button';
import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';

export default function GoogleCustomerLogin() {
  const { establishSession } = useContext(AuthContext);
  const [busy,setBusy] = useState(false);
  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data: { data: challenge } } = await api.post('/auth/google/start',{mode:'mobile'});
      const callback = 'rentalhub://google-signin';
      const result = await WebBrowser.openAuthSessionAsync(`${API_ORIGIN}/mobile-google-sign-in?request=${encodeURIComponent(challenge.id)}`, callback);
      if (result.type !== 'success') return;
      const url = new URL(result.url);
      if (url.protocol !== 'rentalhub:' || url.host !== 'google-signin' || url.searchParams.get('request') !== challenge.id || !/^[a-f0-9]{64}$/.test(url.searchParams.get('code') || '')) throw Error('Invalid Google sign-in response.');
      const { data } = await api.post('/auth/google/mobile/exchange', { request_id:challenge.id, verifier:challenge.verifier, code:url.searchParams.get('code') });
      if (!data.data?.user || !data.data?.token) throw Error('Unable to start your RentalHub session.');
      await establishSession(data.data);
    } catch (e) { Alert.alert(ui('Google sign-in'),e.response?.data?.message || e.message || ui('Please try again.')); }
    finally { setBusy(false); }
  };
  return <Button title={ui('Sign in with Google')} variant="outline" onPress={signIn} loading={busy} disabled={busy} />;
}
