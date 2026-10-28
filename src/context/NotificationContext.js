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
  resetBadgeSession,
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
      void resetBadgeSession().catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;
    let active = true;
    const timers = new Set();
    void resetBadgeSession().then(() => active ? registerForPushNotifications() : undefined).catch((error) => {
      console.warn('Push notification registration failed:', error.message);
    }).finally(() => { if (active) void syncAppIconBadge('notification_permission_ready').catch(() => {}); });
    const refreshTimer = setInterval(() => { if (active && AppState.currentState === 'active') void syncAppIconBadge('foreground_poll').catch(() => {}); }, 30000);

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(openResponse);
    const receivedSubscription =
      Notifications.addNotificationReceivedListener(notification => {
        if (notification.request.content.data?.badgeSummary) return;
        const timer = setTimeout(() => {
          timers.delete(timer);
          if (active) void syncAppIconBadge('push_received').catch(() => {});
        }, 900);
        timers.add(timer);
      });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && active) {
        void syncAppIconBadge('app_foregrounded').catch(() => {});
      }
    });
    const badgeSettingsSubscription = subscribeBadgeSettings();

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active && response) {
        openResponse(response);
        void syncAppIconBadge('notification_opened').catch(() => {});
        void Notifications.clearLastNotificationResponseAsync?.();
      }
    });

    return () => {
      active = false;
      clearInterval(refreshTimer);
      timers.forEach(clearTimeout);
      void resetBadgeSession().catch(() => {});
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
