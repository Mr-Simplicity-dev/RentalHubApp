import React, { useEffect, useState } from 'react';
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
import AppErrorBoundary from './components/common/AppErrorBoundary';

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <BrandSplash />;
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <RealtimeProvider>
            <NotificationProvider>
              <TourProvider>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <NetworkStatusBanner />
                <AppNavigator />
                <NativeCallOverlay />
                <NativeTourManager />
                <Toast />
              </TourProvider>
            </NotificationProvider>
          </RealtimeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
};

export default App;
