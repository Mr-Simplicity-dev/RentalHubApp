import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect } from 'react';
import { AppState, Linking } from 'react-native';
import {
  navigationRef,
  openNotificationDestination,
  openRentalHubLinkInApp,
} from '../navigation/navigationRef';
import {
  configureNotificationPresentation,
  registerForPushNotifications,
} from '../services/pushNotificationService';
import {
  clearAppIconBadge,
  subscribeBadgeSettings,
  syncAppIconBadge,
} from '../services/appBadgeService';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext(null);

configureNotificationPresentation();

const openResponse = (response) => {
  const data = response?.notification?.request?.content?.data || {};
  const open = () => {
    if (openNotificationDestination(data)) return;
    if (data.link && openRentalHubLinkInApp(data.link)) return;
    if (data.link) void Linking.openURL(String(data.link));
  };

  if (navigationRef.isReady()) open();
  else setTimeout(open, 700);
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);

  useEffect(() => {
    if (!isAuthenticated) {
      void clearAppIconBadge().catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;
    void registerForPushNotifications().catch((error) => {
      console.warn('Push notification registration failed:', error.message);
    });
    void syncAppIconBadge('notification_provider_mounted').catch(() => {});

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(openResponse);
    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {
        setTimeout(() => {
          void syncAppIconBadge('push_received').catch(() => {});
        }, 900);
      });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncAppIconBadge('app_foregrounded').catch(() => {});
      }
    });
    const badgeSettingsSubscription = subscribeBadgeSettings();

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openResponse(response);
        void syncAppIconBadge('notification_opened').catch(() => {});
        void Notifications.clearLastNotificationResponseAsync?.();
      }
    });

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
      appStateSubscription.remove();
      badgeSettingsSubscription();
    };
  }, [isAuthenticated, user?.id]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
};
