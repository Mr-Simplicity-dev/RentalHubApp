import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export const APP_SETTINGS_KEY = 'rentalhub.mobileSettings';

export const DEFAULT_APP_SETTINGS = {
  pushMessages: true,
  pushPayments: true,
  pushApplications: true,
  pushBookings: true,
  adminAlerts: true,
  weakNetworkWarnings: true,
  largerText: false,
  reduceMotion: false,
};

const listeners = new Set();

const parseSettings = (raw) => {
  try {
    return raw ? { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) } : DEFAULT_APP_SETTINGS;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
};

const notificationPreferenceKeys = [
  'pushMessages',
  'pushPayments',
  'pushApplications',
  'pushBookings',
  'adminAlerts',
];

const pickNotificationPreferences = (settings = {}) =>
  notificationPreferenceKeys.reduce((acc, key) => {
    if (typeof settings[key] === 'boolean') {
      acc[key] = settings[key];
    }
    return acc;
  }, {});

export const getAppSettings = async () =>
  parseSettings(await AsyncStorage.getItem(APP_SETTINGS_KEY));

export const getSyncedAppSettings = async () => {
  const local = await getAppSettings();
  try {
    const response = await api.get('/notifications/preferences');
    const remote = response.data?.data || {};
    const next = { ...local, ...pickNotificationPreferences(remote) };
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
    listeners.forEach((listener) => listener(next));
    return next;
  } catch {
    return local;
  }
};

export const saveAppSettings = async (settings) => {
  const next = { ...DEFAULT_APP_SETTINGS, ...settings };
  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener(next));
  return next;
};

export const syncNotificationPreferences = async (settings) => {
  const response = await api.patch('/notifications/preferences', {
    preferences: pickNotificationPreferences(settings),
  });
  const next = { ...settings, ...pickNotificationPreferences(response.data?.data || {}) };
  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener(next));
  return next;
};

export const resetAppSettings = async () => {
  await AsyncStorage.removeItem(APP_SETTINGS_KEY);
  listeners.forEach((listener) => listener(DEFAULT_APP_SETTINGS));
  return DEFAULT_APP_SETTINGS;
};

export const subscribeAppSettings = (listener) => {
  listeners.add(listener);
  getAppSettings().then(listener).catch(() => listener(DEFAULT_APP_SETTINGS));
  return () => listeners.delete(listener);
};
