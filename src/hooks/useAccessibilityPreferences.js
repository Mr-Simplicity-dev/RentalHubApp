import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_APP_SETTINGS,
  subscribeAppSettings,
} from '../services/appSettingsService';

export const getAccessibilityScale = (settings = DEFAULT_APP_SETTINGS) =>
  settings.largerText ? 1.15 : 1;

export const scaleFont = (size, settings = DEFAULT_APP_SETTINGS) =>
  Math.round(size * getAccessibilityScale(settings));

export const useAccessibilityPreferences = () => {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);

  useEffect(() => subscribeAppSettings(setSettings), []);

  return useMemo(
    () => ({
      largerText: Boolean(settings.largerText),
      reduceMotion: Boolean(settings.reduceMotion),
      fontScale: getAccessibilityScale(settings),
      scaleFont: (size) => scaleFont(size, settings),
      hitSlop: settings.largerText
        ? { top: 12, bottom: 12, left: 12, right: 12 }
        : { top: 8, bottom: 8, left: 8, right: 8 },
    }),
    [settings]
  );
};
