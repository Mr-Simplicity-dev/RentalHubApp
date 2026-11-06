import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Button from './common/Button';
import AppText from './common/AppText';
import { translateUi as ui } from '../i18n/interfaceRuntime.cjs';

export default function RegistrationCardCheckout({ url, onReturn }) {
  const finished = useRef(false);
  const [error,setError] = useState(() => {
    try {
      const target = new URL(url);
      if (target.protocol === 'https:' && target.hostname === 'checkout.paystack.com' && !target.username && !target.password) return '';
    } catch {}
    return ui('The payment provider returned an unsupported checkout link.');
  });
  const finish = () => { if (!finished.current) { finished.current = true; onReturn(); } };
  const allow = request => {
    try {
      const target = new URL(request.url);
      if (target.protocol === 'https:' && ['rentalhub.com.ng','www.rentalhub.com.ng'].includes(target.hostname) && target.pathname.replace(/\/$/,'') === '/register') { finish(); return false; }
      return target.protocol === 'https:' || request.url === 'about:blank';
    } catch { return false; }
  };
  return <Modal visible animationType="slide" onRequestClose={finish}>
    <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }}>
      <View style={{padding:16,gap:8}}><AppText style={{fontSize:20,fontWeight:'700'}}>{ui('Secure card payment')}</AppText><AppText>{ui('After payment, we will verify it and finish your registration automatically.')}</AppText><Button title={ui('Close and check payment')} variant="outline" onPress={finish} /></View>
      {error ? <View style={{padding:16}}><AppText accessibilityRole="alert">{error}</AppText><Button title={ui('Check payment status')} onPress={finish} /></View> : <WebView
        source={{uri:url}} originWhitelist={['https://*']} onShouldStartLoadWithRequest={allow}
        onNavigationStateChange={state => { allow({url:state.url}); }}
        startInLoadingState renderLoading={() => <ActivityIndicator accessibilityLabel={ui('Loading payment')} />}
        onError={() => setError(ui('Checkout could not load. Close it to check your payment before trying again.'))}
        onHttpError={event => {if(event.nativeEvent.url === url)setError(ui('Checkout is temporarily unavailable.'));}}
        javaScriptEnabled domStorageEnabled mixedContentMode="never" setSupportMultipleWindows={false}
      />}
    </SafeAreaView>
  </Modal>;
}
