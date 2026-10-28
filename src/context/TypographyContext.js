import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { DEFAULT_APP_SETTINGS, subscribeAppSettings } from '../services/appSettingsService';
import { createTypographyMetrics } from '../theme';

const fallbackMetrics = createTypographyMetrics();

export const TypographyContext = createContext(fallbackMetrics);

export const TypographyProvider = ({ children }) => {
  const { width, fontScale } = useWindowDimensions();
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);

  useEffect(() => subscribeAppSettings(setSettings), []);

  const metrics = useMemo(
    () => createTypographyMetrics({
      width,
      fontScale,
      largerText: settings.largerText,
    }),
    [width, fontScale, settings.largerText]
  );

  return (
    <TypographyContext.Provider value={metrics}>
      {children}
    </TypographyContext.Provider>
  );
};

export const useTypography = () => useContext(TypographyContext);
