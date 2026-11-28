import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { NativeModules, Platform } from 'react-native';
import api from './api';

const PUSH_TOKEN_KEY = 'expo_push_token';

export const configureNotificationPresentation = () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isIncomingCall = notification.request.content.data?.type === 'incoming_call';
      const isBadgeSummary = notification.request.content.data?.badgeSummary === true;
      const isLiveMessage =
        notification.request.content.data?.screen === 'Messages';
      return {
        shouldPlaySound: !isIncomingCall && !isLiveMessage && !isBadgeSummary,
        shouldSetBadge: !isIncomingCall,
        shouldShowBanner: !(isIncomingCall && Platform.OS === 'android' && NativeModules.RentalHubIncomingCalls) && !isLiveMessage && !isBadgeSummary,
        shouldShowList: !(isIncomingCall && Platform.OS === 'android' && NativeModules.RentalHubIncomingCalls) && !isLiveMessage && !isBadgeSummary,
      };
    },
  });
};

export const registerForPushNotifications = async ({ requestPermission = true } = {}) => {
  if (!Device.isDevice) {
    return { success: false, reason: 'physical-device-required' };
  }

  if (Platform.OS === 'android') {
    for (const sound of ['normal', 'greeting', 'silent']) {
      await Notifications.setNotificationChannelAsync('calls-' + sound + '-v1', {
        name: sound === 'greeting' ? 'Calls: spoken greeting' : sound === 'silent' ? 'Calls: silent' : 'Calls: normal ringtone',
        importance: Notifications.AndroidImportance.HIGH,
        sound: sound === 'silent' ? null : 'call_' + sound + '.wav',
        showBadge: false,
        enableVibrate: sound !== 'silent',
        vibrationPattern: [0, 300, 150, 300],
        bypassDnd: false,
      });
    }
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      showBadge: true,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 180, 250],
    });
    await Notifications.setNotificationChannelAsync('general', {
      name: 'Updates',
      showBadge: true,
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
    const previous = await Notifications.getNotificationChannelAsync?.('general');
    await Notifications.setNotificationChannelAsync('activity-v2', {
      name: 'RentalHub updates',
      showBadge: true,
      importance: previous && previous.importance < Notifications.AndroidImportance.DEFAULT
        ? previous.importance : Notifications.AndroidImportance.HIGH,
      sound: previous?.sound === null ? null : 'default',
      enableVibrate: previous?.enableVibrate ?? true,
      vibrationPattern: [0, 250, 180, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PRIVATE ?? 0,
      bypassDnd: false,
    });
    await Notifications.setNotificationChannelAsync('unread-activity', {
      name: 'Unread activity',
      importance: Notifications.AndroidImportance.LOW,
      showBadge: true,
      sound: null,
      enableVibrate: false,
    });
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted' && requestPermission) {
    permissions = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
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

  if (Platform.OS === 'android') {
    if (!NativeModules.RentalHubIncomingCalls?.prepareNotifications) {
      return { success: false, reason: 'native-notification-protection-unavailable' };
    }
    await NativeModules.RentalHubIncomingCalls.prepareNotifications();
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
      .slice(0, 230) + (Platform.OS === 'android' && NativeModules.RentalHubIncomingCalls ? ':incoming-v1' : ''),
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
