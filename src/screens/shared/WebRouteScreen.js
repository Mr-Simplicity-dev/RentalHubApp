import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { API_ORIGIN } from '../../services/api';
import {
  isLikelyPaymentReturnUrl,
  recoverPayment,
} from '../../services/paymentRecoveryService';

const escapeForJs = (value = '') =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');

const WebRouteScreen = ({ route, navigation }) => {
  const [session, setSession] = useState({ loading: true, token: '', user: '' });
  const [recoveringPayment, setRecoveringPayment] = useState(false);
  const handledPaymentRef = useRef(false);

  const path = route?.params?.path || '/';
  const title = route?.params?.title || 'Web Module';
  const directUrl = route?.params?.url || '';
  const paymentRecovery = route?.params?.paymentRecovery || null;

  const uri = useMemo(() => {
    if (directUrl) {
      return /^https?:\/\//i.test(directUrl) ? directUrl : `${API_ORIGIN}${directUrl}`;
    }
    return `${API_ORIGIN}${path}`;
  }, [directUrl, path]);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const [token, user] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);

        if (!active) return;

        setSession({
          loading: false,
          token: token || '',
          user: user || '',
        });
      } catch (error) {
        if (!active) return;
        setSession({ loading: false, token: '', user: '' });
      }
    };

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  const handlePaymentReturn = async (url) => {
    if (!paymentRecovery && !isLikelyPaymentReturnUrl(url)) return;
    if (!isLikelyPaymentReturnUrl(url)) return;
    if (handledPaymentRef.current) return;

    handledPaymentRef.current = true;
    setRecoveringPayment(true);

    try {
      const result = await recoverPayment({
        url,
        fallbackFlow: paymentRecovery?.flow,
      });

      if (result.handled && result.success) {
        Toast.show({
          type: 'success',
          text1: 'Payment verified',
          text2: 'Taking you back to the right screen.',
        });
        if (result.destination?.name) {
          navigation.replace(result.destination.name, result.destination.params);
        }
        return;
      }

      Toast.show({
        type: 'info',
        text1: 'Payment not confirmed yet',
        text2: result.message || 'You can retry verification from the payment screen.',
      });
      handledPaymentRef.current = false;
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not verify payment',
        text2: error?.message || 'Please try again.',
      });
      handledPaymentRef.current = false;
    } finally {
      setRecoveringPayment(false);
    }
  };

  if (session.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      try {
        var token = '${escapeForJs(session.token)}';
        var user = '${escapeForJs(session.user)}';

        if (token) {
          localStorage.setItem('token', token);
        }

        if (user) {
          localStorage.setItem('user', user);
        }
      } catch (e) {}
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {recoveringPayment ? (
        <View style={styles.recoveryBanner}>
          <ActivityIndicator color="#0284c7" />
          <Text style={styles.recoveryText}>Verifying payment…</Text>
        </View>
      ) : null}

      <WebView
        source={{ uri }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        onNavigationStateChange={(state) => {
          handlePaymentReturn(state?.url);
        }}
        onShouldStartLoadWithRequest={(request) => {
          handlePaymentReturn(request?.url);
          return true;
        }}
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  backText: { color: '#0f172a', fontSize: 30, lineHeight: 30 },
  headerTitle: { color: '#0f172a', flex: 1, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  recoveryBanner: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderBottomColor: '#bfdbfe',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  recoveryText: { color: '#1e3a8a', fontSize: 12, fontWeight: '600' },
});

export default WebRouteScreen;
