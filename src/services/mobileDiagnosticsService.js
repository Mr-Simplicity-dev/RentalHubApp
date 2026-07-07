import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

export const reportMobileCrash = async (error, errorInfo = {}, metadata = {}) => {
  const message = error?.message || String(error || 'Unknown mobile error');
  const payload = {
    message,
    stack: error?.stack || null,
    component_stack: errorInfo?.componentStack || null,
    platform: Platform.OS,
    app_version:
      Constants.expoConfig?.version ||
      Constants.manifest?.version ||
      Constants.nativeAppVersion ||
      null,
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
