import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_APP_SETTINGS,
  subscribeAppSettings,
} from '../services/appSettingsService';

export const useAccessibilityPreferences = () => {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);

  useEffect(() => subscribeAppSettings(setSettings), []);

  return useMemo(
    () => ({
      largerText: Boolean(settings.largerText),
      reduceMotion: Boolean(settings.reduceMotion),
      hitSlop: settings.largerText
        ? { top: 12, bottom: 12, left: 12, right: 12 }
        : { top: 8, bottom: 8, left: 8, right: 8 },
    }),
    [settings]
  );
};
