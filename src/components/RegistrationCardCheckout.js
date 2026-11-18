import { translateUi as ui } from '../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../i18n/useInterfaceLanguage';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from './common/AppText';
import { colors, typography, typeScale } from '../theme';
import { isSafeHttpsUrl } from '../utils/safeLinks';

const isCheckoutCompleteRedirect = (rawUrl = '') => {
  try {
    const target = new URL(rawUrl);
    if (target.protocol === 'rentalhub:') {
      return true;
    }
    const host = target.hostname.toLowerCase();
    const isRentalHubHost = host === 'rentalhub.com.ng' || host === 'www.rentalhub.com.ng';
    const isPaystackHost = host.endsWith('paystack.com') || host.endsWith('paystack.co');
    if (isRentalHubHost && !isPaystackHost) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export default function RegistrationCardCheckout({
  visible = true,
  url = '',
  title,
  doneLabel,
  onReturn,
  onClose,
}) {
  useInterfaceLanguage();
  const completedRef = useRef(false);

  if (!visible || !isSafeHttpsUrl(url)) {
    return null;
  }

  const triggerReturn = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onReturn?.();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    triggerReturn();
  };

  const allowNavigation = (request) => {
    const nextUrl = String(request?.url || '');
    if (!nextUrl || nextUrl === 'about:blank') return true;
    if (isCheckoutCompleteRedirect(nextUrl)) {
      triggerReturn();
      return false;
    }
    return isSafeHttpsUrl(nextUrl);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel={ui("Close payment")}
            onPress={handleClose}
            style={styles.closeIconBtn}
          >
            <Icon name="close" size={20} color={colors.ink} />
          </TouchableOpacity>
          <AppText style={styles.title} numberOfLines={1}>
            {title || ui("Complete payment")}
          </AppText>
          <TouchableOpacity onPress={triggerReturn} style={styles.doneBtn}>
            <AppText style={styles.doneText}>
              {doneLabel || ui("I have paid")}
            </AppText>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: url }}
          originWhitelist={['https://*']}
          onShouldStartLoadWithRequest={allowNavigation}
          onNavigationStateChange={(state) => allowNavigation({ url: state.url })}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.blue} />
            </View>
          )}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="never"
          setSupportMultipleWindows={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    alignItems: 'center',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeIconBtn: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
  },
  doneBtn: {
    backgroundColor: '#eff6ff',
    borderColor: '#0A66C2',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneText: {
    color: '#0A66C2',
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
