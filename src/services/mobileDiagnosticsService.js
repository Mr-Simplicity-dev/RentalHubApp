import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// The installed native build is the source of truth. app.json / Expo config can drift
// from build.gradle, and reading that first made every fresh install keep reporting an
// old version — so the update check insisted an update was available forever.
const getAppVersion = () =>
  Constants.nativeAppVersion ||
  Constants.expoConfig?.version ||
  Constants.manifest?.version ||
  null;

const getBuildNumber = () => {
  const android = Constants.expoConfig?.android || Constants.manifest?.android || {};
  const ios = Constants.expoConfig?.ios || Constants.manifest?.ios || {};
  if (Platform.OS === 'android') {
    return String(android.versionCode || Constants.nativeBuildVersion || '').trim() || null;
  }
  if (Platform.OS === 'ios') {
    return String(ios.buildNumber || Constants.nativeBuildVersion || '').trim() || null;
  }
  return String(Constants.nativeBuildVersion || '').trim() || null;
};

export const reportMobileCrash = async (error, errorInfo = {}, metadata = {}) => {
  const message = error?.message || String(error || 'Unknown mobile error');
  const payload = {
    message,
    stack: error?.stack || null,
    component_stack: errorInfo?.componentStack || null,
    platform: Platform.OS,
    app_version: getAppVersion(),
    route_name: metadata.routeName || null,
    metadata: {
      js_engine: global.HermesInternal ? 'hermes' : 'jsc',
      fatal: Boolean(metadata.fatal),
      source: metadata.source || 'react_error_boundary',
    },
  };

  try {
    await api.post('/mobile/diagnostics/crash', payload);
  } catch {
    // Crash reporting must never create a second crash loop.
  }
};

export const trackMobileEvent = async (eventName, metadata = {}, screen = '') => {
  try {
    await api.post('/mobile/analytics/events', {
      event_name: eventName,
      screen: screen || metadata.screen || null,
      platform: Platform.OS,
      app_version: getAppVersion(),
      session_id: sessionId,
      metadata: {
        ...metadata,
        js_engine: global.HermesInternal ? 'hermes' : 'jsc',
      },
    });
  } catch {
    // Analytics must never interrupt app workflows.
  }
};

export const getMobileAppVersion = () => getAppVersion();

export const checkMobileAppVersion = async () => {
  const response = await api.get('/mobile/app-version', {
    params: {
      platform: Platform.OS,
      version: getAppVersion(),
      buildNumber: getBuildNumber(),
    },
  });
  return response.data;
};
