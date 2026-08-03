import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

const {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  UI_COPY,
} = require('../i18n/catalog.cjs');

export const LANGUAGE_STORAGE_KEY = 'rentalhub:language:v1';

const supportedCodes = new Set(SUPPORTED_LANGUAGES.map(({ code }) => code));
const normalizeLanguage = (value) => {
  const code = String(value || '').trim().toLowerCase().split(/[-_]/)[0];
  return supportedCodes.has(code) ? code : DEFAULT_LANGUAGE;
};

const detectDeviceLanguage = () => {
  try {
    return normalizeLanguage(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

const interpolate = (value, variables = {}) => String(value).replace(
  /\{([a-zA-Z0-9_]+)\}/g,
  (_, key) => variables[key] == null ? `{${key}}` : String(variables[key])
);

export const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(detectDeviceLanguage);
  const [ready, setReady] = useState(false);
  const [rtlRestartRequired, setRtlRestartRequired] = useState(false);

  const languageDefinition = SUPPORTED_LANGUAGES.find(
    ({ code }) => code === language
  ) || SUPPORTED_LANGUAGES[0];
  const isRTL = Boolean(languageDefinition.rtl);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((storedLanguage) => {
        if (active && storedLanguage) {
          setLanguageState(normalizeLanguage(storedLanguage));
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    I18nManager.allowRTL(true);
    I18nManager.swapLeftAndRightInRTL(true);
    const directionChanged = I18nManager.isRTL !== isRTL;
    setRtlRestartRequired(directionChanged);
    if (directionChanged) {
      I18nManager.forceRTL(isRTL);
    }
  }, [isRTL, ready]);

  const setLanguage = useCallback(async (nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    const nextIsRTL = Boolean(
      SUPPORTED_LANGUAGES.find(({ code }) => code === normalized)?.rtl
    );
    const restartRequired = I18nManager.isRTL !== nextIsRTL;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    setLanguageState(normalized);
    setRtlRestartRequired(restartRequired);
    return { language: normalized, restartRequired };
  }, []);

  const t = useCallback((key, variables) => {
    const localized = UI_COPY[language]?.[key];
    const fallback = UI_COPY[DEFAULT_LANGUAGE]?.[key];
    return interpolate(localized ?? fallback ?? key, variables);
  }, [language]);

  const value = useMemo(() => ({
    direction: isRTL ? 'rtl' : 'ltr',
    isRTL,
    language,
    languages: SUPPORTED_LANGUAGES,
    ready,
    rtlRestartRequired,
    setLanguage,
    t,
    textAlign: isRTL ? 'right' : 'left',
  }), [
    isRTL,
    language,
    ready,
    rtlRestartRequired,
    setLanguage,
    t,
  ]);

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export default LanguageContext;
