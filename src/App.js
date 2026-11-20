import React, { useContext, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { NotificationProvider } from './context/NotificationContext';
import { TourProvider } from './context/TourContext';
import { LanguageProvider } from './context/LanguageContext';
import { TypographyProvider } from './context/TypographyContext';
import AppNavigator from './navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import BrandSplash from './components/brand/BrandSplash';
import NativeTourManager from './components/tour/NativeTourManager';
import TourNavigationBridge from './components/tour/TourNavigationBridge';
import NetworkStatusBanner from './components/common/NetworkStatusBanner';
import NativeCallOverlay from './components/calls/NativeCallOverlay';
import AppUpdateIndicator from './components/common/AppUpdateIndicator';
import NinCaptureModal from './components/identity/NinCaptureModal';
import MfaCodeModal from './components/common/MfaCodeModal';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import { subscribeNetworkStatus } from './services/networkStatusService';
import { flushOfflineQueue, hydrateOfflineQueue } from './services/offlineActionQueueService';
import { trackMobileEvent } from './services/mobileDiagnosticsService';
import { checkForAppUpdate } from './services/appUpdateService';
import { AuthContext } from './context/AuthContext';

const APP_INTRO_DURATION_MS = 3200;

export const AppContent = ({ fontsReady = true } = {}) => {
  const {
    isAuthenticated,
    isImpersonating,
    loading: authLoading,
    user,
  } = useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!fontsReady) return undefined;
    const timer = setTimeout(() => setShowSplash(false), APP_INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [fontsReady]);

  useEffect(() => {
    trackMobileEvent('app_opened', { source: 'native_app_root' });
    checkForAppUpdate().catch(() => {});
  }, []);

  useEffect(() => {
    hydrateOfflineQueue().catch(() => {});
  }, [
    authLoading,
    isAuthenticated,
    isImpersonating,
    user?.id,
    user?.user_type,
  ]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return undefined;
    }

    flushOfflineQueue().catch(() => {});
    const unsubscribe = subscribeNetworkStatus((status) => {
      if (status.online && !status.weak) {
        flushOfflineQueue().catch(() => {});
      }
    });
    return unsubscribe;
  }, [
    authLoading,
    isAuthenticated,
    isImpersonating,
    user?.id,
    user?.user_type,
  ]);

  if (showSplash || authLoading || !fontsReady) {
    return <BrandSplash duration={APP_INTRO_DURATION_MS} fontsReady={fontsReady} showProgressPercent={false} />;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <NetworkStatusBanner />
      <AppNavigator />
      {isAuthenticated ? <NativeCallOverlay /> : null}
      {isAuthenticated ? <AppUpdateIndicator /> : null}
      {isAuthenticated ? <NinCaptureModal /> : null}
      {isAuthenticated ? <MfaCodeModal /> : null}
      <TourNavigationBridge />
      <NativeTourManager />
      <Toast />
    </>
  );
};

const App = () => {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <TypographyProvider>
          <AuthProvider>
            <LanguageProvider fallback={<BrandSplash fontsReady={false} />}>
              <RealtimeProvider>
                <NotificationProvider>
                  <TourProvider>
                    <AppContent fontsReady={fontsLoaded || Boolean(fontError)} />
                  </TourProvider>
                </NotificationProvider>
              </RealtimeProvider>
            </LanguageProvider>
          </AuthProvider>
        </TypographyProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
};

export default App;
