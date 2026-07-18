import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

const PUSH_TOKEN_KEY = 'expo_push_token';

export const configureNotificationPresentation = () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isLiveMessage =
        notification.request.content.data?.screen === 'Messages';
      return {
        shouldPlaySound: !isLiveMessage,
        shouldSetBadge: true,
        shouldShowBanner: !isLiveMessage,
        shouldShowList: !isLiveMessage,
      };
    },
  });
};

export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    return { success: false, reason: 'physical-device-required' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 180, 250],
    });
    await Notifications.setNotificationChannelAsync('general', {
      name: 'RentalHub updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted') {
    permissions = await Notifications.requestPermissionsAsync();
  }
  if (permissions.status !== 'granted') {
    return { success: false, reason: 'permission-denied' };
  }

  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    return { success: false, reason: 'missing-project-id' };
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;
  await api.post('/notifications/devices', {
    token,
    platform: Platform.OS,
    device_id: [Device.brand, Device.modelName, Device.osBuildId]
      .filter(Boolean)
      .join(':')
      .slice(0, 255),
  });
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return { success: true, token };
};

export const unregisterPushDevice = async () => {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await api.delete('/notifications/devices', { data: { token } });
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
};
