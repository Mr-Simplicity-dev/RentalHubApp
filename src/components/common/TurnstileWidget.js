import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const TURNSTILE_SITE_KEY = Constants.expoConfig?.extra?.TURNSTILE_SITE_KEY;

const TURNSTILE_ORIGIN = 'https://rentalhub.com.ng/';

const TURNSTILE_HTML = (siteKey, action) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; background: transparent; }
    body { display: flex; align-items: center; justify-content: center; }
    #turnstile-scale {
      transform-origin: top center;
      will-change: transform;
    }
    #turnstile-container { width: 300px; min-height: 65px; }
  </style>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
</head>
<body>
  <div id="turnstile-scale">
    <div id="turnstile-container"></div>
  </div>
  <script>
    var scaleBox = document.getElementById('turnstile-scale');
    var container = document.getElementById('turnstile-container');

    function fitToScreen() {
      var avail = Math.max(document.documentElement.clientWidth || 300, 1);
      var scale = Math.min(1, avail / 300);
      scaleBox.style.transform = 'scale(' + scale + ')';
      var box = scaleBox.getBoundingClientRect();
      document.body.style.minHeight = Math.ceil(box.height) + 'px';
    }

    function postHeight() {
      fitToScreen();
      var h = scaleBox.getBoundingClientRect().height;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height: Math.max(65, Math.ceil(h)) }));
    }

    var rendered = false;

    function renderWidget() {
      if (rendered) return;
      rendered = true;
      var options = {
        sitekey: '${siteKey}',
        callback: function(token) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token: token }));
        },
        'expired-callback': function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
        },
        'error-callback': function() {
          // Retry once with a clean widget before surfacing the error.
          if (window.__turnstileRetried) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
            return;
          }
          window.__turnstileRetried = true;
          try {
            window.turnstile.reset();
            window.turnstile.render(container, options);
          } catch (e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
          }
        }
      };
      ${action ? `options.action = '${action}';` : ''}
      window.turnstile.render(container, options);
    }

    function onTurnstileLoaded() {
      if (!window.turnstile) return;
      renderWidget();
      postHeight();
      if (window.ResizeObserver) {
        try {
          new ResizeObserver(function() { postHeight(); }).observe(container);
        } catch (e) {}
      }
      window.addEventListener('resize', function() { postHeight(); });
      setInterval(postHeight, 700);
    }

    window.addEventListener('load', function() { fitToScreen(); postHeight(); });

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

const TurnstileWidget = forwardRef(({ onToken, onExpire, onError, action }, ref) => {
  const webViewRef = useRef(null);
  const [webviewHeight, setWebviewHeight] = useState(72);
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
        case 'height': {
          const h = Number(data.height);
          if (Number.isFinite(h) && h > 0) {
            setWebviewHeight(Math.min(Math.max(h, 60), 420));
          }
          break;
        }
        default:
          break;
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setWebviewHeight((prev) => (prev === 72 ? 90 : prev)), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.webviewWrapper, { height: webviewHeight }]}>
        <WebView
          ref={webViewRef}
          source={{ html: TURNSTILE_HTML(TURNSTILE_SITE_KEY, action || ''), baseUrl: TURNSTILE_ORIGIN }}
          onMessage={handleMessage}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[turnstile] http error', nativeEvent?.statusCode, nativeEvent?.url);
            callbacksRef.current.onError?.();
          }}
          onError={(syntheticEvent) => {
            console.warn('[turnstile] load error', syntheticEvent?.nativeEvent?.description);
            callbacksRef.current.onError?.();
          }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['https://challenges.cloudflare.com', 'https://rentalhub.com.ng']}
          mixedContentMode="never"
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
    width: '100%',
    marginVertical: 8,
  },
  webviewWrapper: {
    width: '100%',
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
