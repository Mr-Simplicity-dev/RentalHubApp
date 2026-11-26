import {notificationService} from '../services/notificationService';
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

const isAllowedExternalLink = (link) =>
  /^https?:\/\/(www\.)?rentalhub\.com\.ng\//i.test(String(link || '').trim());

export const openResponse = (response, { isActive = () => true, timers } = {}) => {
  const data = response?.notification?.request?.content?.data || {};
  let attempts = 0;
  const open = () => {
    if (!isActive()) return;
    if (!navigationRef.isReady()) {
      if (attempts++ >= 40) return;
      const timer = setTimeout(() => { timers?.delete(timer); open(); }, 250);
      timers?.add(timer);
      return;
    }
    if(/^\d+$/.test(String(data.notificationId||'')))void notificationService.markAsRead(data.notificationId).then(()=>syncAppIconBadge('push_read')).catch(()=>{});
    if (openNotificationDestination(data)) return;
    if (data.link && openRentalHubLinkInApp(data.link)) return;
    if (data.link && isAllowedExternalLink(data.link)) { void Linking.openURL(String(data.link)); return; }
    openNotificationDestination({ screen: 'Notifications' });
  };
  open();
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user, loading: authLoading } = useContext(AuthContext);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      void resetBadgeSession().catch(() => {});
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return undefined;
    let active = true;
    const timers = new Set();
    const opened = new Set();
    const handleResponse = response => {
      const request = response?.notification?.request;
      const recipient = request?.content?.data?.receiverId;
      if (!active || (recipient != null && String(recipient) !== String(user.id))) return;
      const key = request?.identifier;
      if (key && opened.has(key)) return;
      if (key) opened.add(key);
      openResponse(response, { isActive: () => active, timers });
    };
    let registering = false, refreshPending = false, attempts = 0, lastRegistered = 0, retryTimer;
    const register = async (requestPermission = false) => {
      if (!active || registering || (!requestPermission && Date.now() - lastRegistered < 60000)) return;
      registering = true;
      try {
        const result = await registerForPushNotifications({ requestPermission });
        if (active && result?.success) { attempts = 0; lastRegistered = Date.now(); clearTimeout(retryTimer); }
      } catch (error) {
        console.warn('Push notification registration failed:', error.message);
        if (active && attempts < 3) retryTimer = setTimeout(() => { void register(false); }, [3000, 10000, 30000][attempts++]);
      } finally {
        registering = false;
        if (active) void syncAppIconBadge('notification_permission_ready').catch(() => {});
        if (active && refreshPending) { refreshPending = false; lastRegistered = 0; void register(false); }
      }
    };
    void resetBadgeSession().then(() => register(true)).catch(() => {});
    const tokenSubscription = Notifications.addPushTokenListener?.(() => {
      if (registering) refreshPending = true;
      else { lastRegistered = 0; void register(false); }
    });
    const refreshTimer = setInterval(() => { if (active && AppState.currentState === 'active') void syncAppIconBadge('foreground_poll').catch(() => {}); }, 30000);

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
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
        void register(false);
        void syncAppIconBadge('app_foregrounded').catch(() => {});
      }
    });
    const badgeSettingsSubscription = subscribeBadgeSettings();

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active && response) {
        handleResponse(response);
        void syncAppIconBadge('notification_opened').catch(() => {});
        void Notifications.clearLastNotificationResponseAsync?.();
      }
    });

    return () => {
      active = false;
      clearInterval(refreshTimer);
      clearTimeout(retryTimer);
      tokenSubscription?.remove();
      timers.forEach(clearTimeout);
      void resetBadgeSession().catch(() => {});
      responseSubscription.remove();
      receivedSubscription.remove();
      appStateSubscription.remove();
      badgeSettingsSubscription();
    };
  }, [isAuthenticated, user?.id, authLoading]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
};
