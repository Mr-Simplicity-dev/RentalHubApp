import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEYCHAIN_SERVICE = 'com.rentalhubng.support.guest-tickets';
const KEYCHAIN_USERNAME = 'guest_support_credentials';
const FALLBACK_KEY = 'rentalhub_guest_support_credentials_v1';
const FALLBACK_PENDING_KEY = `${FALLBACK_KEY}:pending`;
const TOKEN_PATTERN = /^rhg_[A-Za-z0-9_-]{43}$/;
const MAX_STORED_TICKETS = 20;

let Keychain = null;
if (Platform.OS !== 'web') {
  try {
    Keychain = require('react-native-keychain');
  } catch {
    Keychain = null;
  }
}

let mutationQueue = Promise.resolve();

const hasKeychain = () =>
  Boolean(
    Keychain
      && typeof Keychain.getGenericPassword === 'function'
      && typeof Keychain.setGenericPassword === 'function'
      && typeof Keychain.resetGenericPassword === 'function'
  );

const keychainOptions = () => {
  const options = { service: KEYCHAIN_SERVICE };
  const accessible = Keychain?.ACCESSIBLE?.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  if (accessible) options.accessible = accessible;
  return options;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const normalizeTicketId = (value) => {
  const ticketId = Number(value);
  return Number.isInteger(ticketId) && ticketId > 0 ? ticketId : null;
};

const normalizeCredentials = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((row) =>
      normalizeTicketId(row?.ticketId)
      && TOKEN_PATTERN.test(String(row?.guestAccessToken || '').trim())
    )
    .map((row) => ({
      ticketId: normalizeTicketId(row.ticketId),
      guestAccessToken: String(row.guestAccessToken).trim(),
      email: normalizeEmail(row.email),
      savedAt: Number(row.savedAt) || 0,
    }))
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(0, MAX_STORED_TICKETS);
};

const parseCredentials = (serialized) => {
  if (!serialized) return [];
  try {
    return normalizeCredentials(JSON.parse(serialized));
  } catch {
    return [];
  }
};

const readFallback = async () => {
  try {
    return parseCredentials(await AsyncStorage.getItem(FALLBACK_KEY));
  } catch {
    return [];
  }
};

const writeFallback = async (credentials) => {
  try {
    const rows = [[FALLBACK_KEY, JSON.stringify(credentials)]];
    if (hasKeychain()) rows.push([FALLBACK_PENDING_KEY, 'true']);
    if (typeof AsyncStorage.multiSet === 'function') {
      await AsyncStorage.multiSet(rows);
    } else {
      for (const [key, value] of rows) {
        await AsyncStorage.setItem(key, value);
      }
    }
    return true;
  } catch {
    return false;
  }
};

const readCredentials = async () => {
  if (!hasKeychain()) return readFallback();

  try {
    if ((await AsyncStorage.getItem(FALLBACK_PENDING_KEY)) === 'true') {
      const fallbackCredentials = await readFallback();
      try {
        await Keychain.setGenericPassword(
          KEYCHAIN_USERNAME,
          JSON.stringify(fallbackCredentials),
          keychainOptions()
        );
        if (typeof AsyncStorage.multiRemove === 'function') {
          await AsyncStorage.multiRemove([FALLBACK_KEY, FALLBACK_PENDING_KEY]);
        } else {
          await AsyncStorage.removeItem(FALLBACK_KEY);
          await AsyncStorage.removeItem(FALLBACK_PENDING_KEY);
        }
      } catch {
        // Keep the authoritative fallback until secure storage recovers.
      }
      return fallbackCredentials;
    }
  } catch {
    // Continue to the secure record when fallback state cannot be read.
  }

  try {
    const secureValue = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
    if (secureValue?.username === KEYCHAIN_USERNAME) {
      const credentials = parseCredentials(secureValue.password);
      try {
        if (typeof AsyncStorage.multiRemove === 'function') {
          await AsyncStorage.multiRemove([FALLBACK_KEY, FALLBACK_PENDING_KEY]);
        } else {
          await AsyncStorage.removeItem(FALLBACK_KEY);
          await AsyncStorage.removeItem(FALLBACK_PENDING_KEY);
        }
      } catch {}
      return credentials;
    }
  } catch {
    // A temporary Keychain failure falls back to local storage below.
  }

  const fallbackCredentials = await readFallback();
  if (fallbackCredentials.length) {
    try {
      await Keychain.setGenericPassword(
        KEYCHAIN_USERNAME,
        JSON.stringify(fallbackCredentials),
        keychainOptions()
      );
      if (typeof AsyncStorage.multiRemove === 'function') {
        await AsyncStorage.multiRemove([FALLBACK_KEY, FALLBACK_PENDING_KEY]);
      } else {
        await AsyncStorage.removeItem(FALLBACK_KEY);
        await AsyncStorage.removeItem(FALLBACK_PENDING_KEY);
      }
    } catch {
      // Keep the fallback until secure storage becomes available.
    }
  }
  return fallbackCredentials;
};

const writeCredentials = async (credentials) => {
  const normalized = normalizeCredentials(credentials);
  if (!hasKeychain()) return writeFallback(normalized);

  try {
    await Keychain.setGenericPassword(
      KEYCHAIN_USERNAME,
      JSON.stringify(normalized),
      keychainOptions()
    );
    try {
      if (typeof AsyncStorage.multiRemove === 'function') {
        await AsyncStorage.multiRemove([FALLBACK_KEY, FALLBACK_PENDING_KEY]);
      } else {
        await AsyncStorage.removeItem(FALLBACK_KEY);
        await AsyncStorage.removeItem(FALLBACK_PENDING_KEY);
      }
    } catch {}
    return true;
  } catch {
    return writeFallback(normalized);
  }
};

const mutateCredentials = (operation) => {
  const nextMutation = mutationQueue.then(async () => {
    const current = await readCredentials();
    return operation(current);
  });
  mutationQueue = nextMutation.catch(() => {});
  return nextMutation;
};

export const guestSupportCredentialService = {
  save: async ({ ticketId, guestAccessToken, email }) => {
    const credential = {
      ticketId: normalizeTicketId(ticketId),
      guestAccessToken: String(guestAccessToken || '').trim(),
      email: normalizeEmail(email),
      savedAt: Date.now(),
    };

    if (
      !credential.ticketId
      || !TOKEN_PATTERN.test(credential.guestAccessToken)
    ) {
      return false;
    }

    return mutateCredentials(async (current) =>
      writeCredentials([
        credential,
        ...current.filter((row) => row.ticketId !== credential.ticketId),
      ])
    );
  },

  get: async (ticketId) => {
    const normalizedTicketId = normalizeTicketId(ticketId);
    if (!normalizedTicketId) return null;
    const credentials = await readCredentials();
    return credentials.find((row) => row.ticketId === normalizedTicketId) || null;
  },

  listForEmail: async (email) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return [];
    const credentials = await readCredentials();
    return credentials.filter((row) => row.email === normalizedEmail);
  },

  remove: async (ticketId) => {
    const normalizedTicketId = normalizeTicketId(ticketId);
    if (!normalizedTicketId) return false;
    return mutateCredentials(async (current) =>
      writeCredentials(
        current.filter((row) => row.ticketId !== normalizedTicketId)
      )
    );
  },

  clearAll: async () => mutateCredentials(async () => {
    const results = await Promise.allSettled([
      hasKeychain()
        ? Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE })
        : Promise.resolve(true),
      AsyncStorage.removeItem(FALLBACK_KEY),
      AsyncStorage.removeItem(FALLBACK_PENDING_KEY),
    ]);
    return results.every((result) => result.status === 'fulfilled');
  }),
};
