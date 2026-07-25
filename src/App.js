import React, { useContext, useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { NotificationProvider } from './context/NotificationContext';
import { TourProvider } from './context/TourContext';
import AppNavigator from './navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import BrandSplash from './components/brand/BrandSplash';
import NativeTourManager from './components/tour/NativeTourManager';
import NetworkStatusBanner from './components/common/NetworkStatusBanner';
import NativeCallOverlay from './components/calls/NativeCallOverlay';
import AppUpdateIndicator from './components/common/AppUpdateIndicator';
import AppErrorBoundary from './components/common/AppErrorBoundary';
import { subscribeNetworkStatus } from './services/networkStatusService';
import { flushOfflineQueue, hydrateOfflineQueue } from './services/offlineActionQueueService';
import { trackMobileEvent } from './services/mobileDiagnosticsService';
import { AuthContext } from './context/AuthContext';

const APP_INTRO_DURATION_MS = 8000;

const AppContent = () => {
  const {
    isAuthenticated,
    isImpersonating,
    loading: authLoading,
    user,
  } = useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), APP_INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    trackMobileEvent('app_opened', { source: 'native_app_root' });
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

  if (showSplash) {
    return <BrandSplash duration={APP_INTRO_DURATION_MS} showProgressPercent={false} />;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <NetworkStatusBanner />
      <AppNavigator />
      <NativeCallOverlay />
      <AppUpdateIndicator />
      <NativeTourManager />
      <Toast />
    </>
  );
};

const App = () => {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <RealtimeProvider>
            <NotificationProvider>
              <TourProvider>
                <AppContent />
              </TourProvider>
            </NotificationProvider>
          </RealtimeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
};

export default App;
