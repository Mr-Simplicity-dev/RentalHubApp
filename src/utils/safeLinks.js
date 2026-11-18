import { Linking } from 'react-native';

const DEFAULT_ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:', 'tel:'];
const UNSAFE_SCHEME_PATTERN = /^\s*(?:javascript|vbscript|data|file|intent|content):/i;

export const isAllowedExternalUrl = (
  rawUrl = '',
  allowedProtocols = DEFAULT_ALLOWED_PROTOCOLS
) => {
  const value = String(rawUrl || '').trim();
  if (!value || UNSAFE_SCHEME_PATTERN.test(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const isSafeHttpsUrl = (rawUrl = '') =>
  isAllowedExternalUrl(rawUrl, ['https:']);

export const openSafeExternalUrl = async (
  rawUrl,
  {
    allowedProtocols = DEFAULT_ALLOWED_PROTOCOLS,
    onBlocked,
  } = {}
) => {
  const value = String(rawUrl || '').trim();
  if (!isAllowedExternalUrl(value, allowedProtocols)) {
    onBlocked?.();
    return false;
  }

  try {
    await Linking.openURL(value);
    return true;
  } catch {
    onBlocked?.();
    return false;
  }
};
