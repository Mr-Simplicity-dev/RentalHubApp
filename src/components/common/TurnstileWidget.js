import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const TURNSTILE_SITE_KEY = Constants.expoConfig?.extra?.TURNSTILE_SITE_KEY;

const TURNSTILE_HTML = (siteKey) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; background: transparent; }
    body { display: flex; align-items: center; justify-content: center; }
  </style>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
</head>
<body>
  <div id="turnstile-container"></div>
  <script>
    function onTurnstileLoaded() {
      if (window.turnstile) {
        window.turnstile.render('#turnstile-container', {
          sitekey: '${siteKey}',
          callback: function(token) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token: token }));
          },
          'expired-callback': function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
          },
          'error-callback': function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
          }
        });
      }
    }

    if (window.turnstile) {
      onTurnstileLoaded();
    } else {
      var checkInterval = setInterval(function() {
        if (window.turnstile) {
          clearInterval(checkInterval);
          onTurnstileLoaded();
        }
      }, 100);
    }
  </script>
</body>
</html>`;

const TurnstileWidget = forwardRef(({ onToken, onExpire, onError }, ref) => {
  const webViewRef = useRef(null);
  const callbacksRef = useRef({ onToken, onExpire, onError });
  callbacksRef.current = { onToken, onExpire, onError };

  useImperativeHandle(ref, () => ({
    reset() {
      if (webViewRef.current) {
        webViewRef.current.reload();
      }
    },
  }), []);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'token':
          callbacksRef.current.onToken?.(data.token);
          break;
        case 'expired':
          callbacksRef.current.onExpire?.();
          break;
        case 'error':
          callbacksRef.current.onError?.();
          break;
        default:
          break;
      }
    } catch {}
  }, []);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.webviewWrapper}>
        <WebView
          ref={webViewRef}
          source={{ html: TURNSTILE_HTML(TURNSTILE_SITE_KEY) }}
          onMessage={handleMessage}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
          cacheEnabled={true}
          overScrollMode="never"
        />
      </View>
    </View>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  webviewWrapper: {
    width: '100%',
    maxWidth: 300,
    height: 72,
    minHeight: 65,
    overflow: 'hidden',
    borderRadius: 4,
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default TurnstileWidget;
