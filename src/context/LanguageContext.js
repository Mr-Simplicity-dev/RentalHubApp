import { setInterfaceLanguage } from '../i18n/interfaceRuntime.cjs';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, View } from 'react-native';

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
  const languageWrites = useRef(Promise.resolve());


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
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
    I18nManager.swapLeftAndRightInRTL(false);
  }, []);

  useEffect(() => { setInterfaceLanguage(language); }, [language]);

  const setLanguage = useCallback(async (nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    try {
      languageWrites.current = languageWrites.current.catch(() => {}).then(() => AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalized));
      await languageWrites.current;
    } catch {
    }
    return { language: normalized, restartRequired: false };
  }, []);

  const t = useCallback((key, variables) => {
    const localized = UI_COPY[language]?.[key];
    const fallback = UI_COPY[DEFAULT_LANGUAGE]?.[key];
    return interpolate(localized ?? fallback ?? key, variables);
  }, [language]);

  const value = useMemo(() => ({
    direction: 'ltr',
    textDirection: isRTL ? 'rtl' : 'ltr',
    isRTL,
    language,
    languages: SUPPORTED_LANGUAGES,
    ready,
    rtlRestartRequired: false,
    setLanguage,
    t,
    textAlign: isRTL ? 'right' : 'left',
  }), [
    isRTL,
    language,
    ready,
    setLanguage,
    t,
  ]);

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={value}>
      <View style={{ flex: 1, direction: 'ltr' }}>{children}</View>
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
