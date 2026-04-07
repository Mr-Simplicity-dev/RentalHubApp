import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ORIGIN } from '../../services/api';

const escapeForJs = (value = '') =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');

const WebRouteScreen = ({ route }) => {
  const [session, setSession] = useState({ loading: true, token: '', user: '' });

  const path = route?.params?.path || '/';
  const title = route?.params?.title || 'Web Module';

  const uri = useMemo(() => `${API_ORIGIN}${path}`, [path]);

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
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <WebView
        source={{ uri }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
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
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  headerTitle: { color: '#0f172a', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default WebRouteScreen;
