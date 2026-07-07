import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useEffect } from 'react';
import { Linking } from 'react-native';
import { navigationRef, openNotificationDestination } from '../navigation/navigationRef';
import {
  configureNotificationPresentation,
  registerForPushNotifications,
} from '../services/pushNotificationService';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext(null);

configureNotificationPresentation();

const openResponse = (response) => {
  const data = response?.notification?.request?.content?.data || {};
  const open = () => {
    if (openNotificationDestination(data)) return;
    if (data.link) void Linking.openURL(String(data.link));
  };

  if (navigationRef.isReady()) open();
  else setTimeout(open, 700);
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;
    void registerForPushNotifications().catch((error) => {
      console.warn('Push notification registration failed:', error.message);
    });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(openResponse);

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openResponse(response);
        void Notifications.clearLastNotificationResponseAsync?.();
      }
    });

    return () => responseSubscription.remove();
  }, [isAuthenticated, user?.id]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
};
