import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_SERVICE = 'com.rentalhubng.auth.token';
const SESSION_TOKEN_SERVICE = 'com.rentalhubng.auth.session-token';
const USER_SERVICE = 'com.rentalhubng.auth.user';
const IMPERSONATION_SERVICE = 'com.rentalhubng.auth.impersonation-original';

const SECURE_RECORDS = Object.freeze({
  token: {
    service: TOKEN_SERVICE,
    username: 'token',
    storageKey: 'token',
  },
  sessionToken: {
    service: SESSION_TOKEN_SERVICE,
    username: 'session_token',
    storageKey: 'session_token',
  },
  user: {
    service: USER_SERVICE,
    username: 'user',
    storageKey: 'user',
  },
  impersonation: {
    service: IMPERSONATION_SERVICE,
    username: 'original_session',
    storageKey: 'impersonation_original_session',
  },
});

const FALLBACK_MARKER_PREFIX = 'rentalhub_secure_fallback:';

let Keychain = null;
if (Platform.OS !== 'web') {
  try {
    Keychain = require('react-native-keychain');
  } catch (error) {
    Keychain = null;
  }
}

let legacyUserMigrationComplete = false;
let legacyUserMigrationPromise = null;

const hasKeychain = () =>
  Boolean(
    Keychain &&
      typeof Keychain.getGenericPassword === 'function' &&
      typeof Keychain.setGenericPassword === 'function' &&
      typeof Keychain.resetGenericPassword === 'function'
  );

const getKeychainOptions = (service) => {
  const options = { service };
  const accessible = Keychain?.ACCESSIBLE?.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

  if (accessible) {
    options.accessible = accessible;
  }

  return options;
};

const getFallbackMarkerKey = (record) =>
  `${FALLBACK_MARKER_PREFIX}${record.storageKey}`;

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const parseStoredObject = (value) => {
  if (!isNonEmptyString(value)) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch (error) {
    return null;
  }
};

const removeAsyncKeys = async (keys) => {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      await AsyncStorage.removeItem(key);
    })
  );

  return results.every((result) => result.status === 'fulfilled');
};

const clearFallback = async (record) =>
  removeAsyncKeys([record.storageKey, getFallbackMarkerKey(record)]);

const readFallback = async (record) => {
  try {
    return await AsyncStorage.getItem(record.storageKey);
  } catch (error) {
    return null;
  }
};

const hasPendingFallback = async (record) => {
  try {
    return (
      (await AsyncStorage.getItem(getFallbackMarkerKey(record))) === 'pending'
    );
  } catch (error) {
    return false;
  }
};

const writeFallback = async (record, value) => {
  const rows = [[record.storageKey, value]];

  if (hasKeychain()) {
    rows.push([getFallbackMarkerKey(record), 'pending']);
  }

  try {
    if (typeof AsyncStorage.multiSet === 'function') {
      await AsyncStorage.multiSet(rows);
    } else {
      for (const [key, rowValue] of rows) {
        await AsyncStorage.setItem(key, rowValue);
      }
    }
    return true;
  } catch (error) {
    return false;
  }
};

const resetKeychainRecord = async (record) => {
  if (!hasKeychain()) {
    return true;
  }

  try {
    await Keychain.resetGenericPassword({ service: record.service });
    return true;
  } catch (error) {
    return false;
  }
};

const writeKeychainValue = async (record, value) => {
  await Keychain.setGenericPassword(
    record.username,
    value,
    getKeychainOptions(record.service)
  );
};

const finishSecureWrite = async (record, value) => {
  const fallbackRemoved = await clearFallback(record);

  if (!fallbackRemoved) {
    // If cleanup is temporarily unavailable, keep any fallback copy aligned with
    // the new secure value so a stale credential can never win on the next read.
    await writeFallback(record, value);
  }
};

const migrateLegacyUserCredential = async () => {
  if (!hasKeychain() || legacyUserMigrationComplete) {
    return legacyUserMigrationComplete;
  }

  if (legacyUserMigrationPromise) {
    return legacyUserMigrationPromise;
  }

  legacyUserMigrationPromise = (async () => {
    let legacyCredentials;

    try {
      legacyCredentials = await Keychain.getGenericPassword({
        service: TOKEN_SERVICE,
      });
    } catch (error) {
      return false;
    }

    if (!legacyCredentials || legacyCredentials.username !== 'user') {
      legacyUserMigrationComplete = true;
      return true;
    }

    const legacyUser = parseStoredObject(legacyCredentials.password);

    if (!legacyUser) {
      const removed = await resetKeychainRecord(SECURE_RECORDS.token);
      legacyUserMigrationComplete = removed;
      return removed;
    }

    let currentUserCredentials;

    try {
      currentUserCredentials = await Keychain.getGenericPassword({
        service: USER_SERVICE,
      });
    } catch (error) {
      return false;
    }

    const currentUser =
      currentUserCredentials?.username === 'user'
        ? parseStoredObject(currentUserCredentials.password)
        : null;

    if (!currentUser) {
      try {
        await writeKeychainValue(
          SECURE_RECORDS.user,
          legacyCredentials.password
        );
      } catch (error) {
        return false;
      }
    }

    await finishSecureWrite(
      SECURE_RECORDS.user,
      currentUser
        ? currentUserCredentials.password
        : legacyCredentials.password
    );

    // The old user credential occupied the token service. The user is safely in
    // its dedicated service before this legacy slot is removed.
    const legacyRemoved = await resetKeychainRecord(SECURE_RECORDS.token);
    legacyUserMigrationComplete = legacyRemoved;
    return legacyRemoved;
  })();

  try {
    return await legacyUserMigrationPromise;
  } finally {
    legacyUserMigrationPromise = null;
  }
};

// Only auth tokens may use the plaintext fallback (required to stay logged in
// on devices with a broken Keychain). User identity data (NIN, passports, etc.)
// and impersonation sessions must NEVER be written outside secure storage —
// they are derived data that can be refetched from the API.
const mayUseFallback = (record) =>
  record === SECURE_RECORDS.token || record === SECURE_RECORDS.sessionToken;

const saveSecureValue = async (record, value) => {
  if (!isNonEmptyString(value)) {
    return false;
  }

  if (!hasKeychain()) {
    if (!mayUseFallback(record)) return false;
    return writeFallback(record, value);
  }

  if (record === SECURE_RECORDS.token) {
    await migrateLegacyUserCredential();
  }

  try {
    await writeKeychainValue(record, value);
    await finishSecureWrite(record, value);
    return true;
  } catch (error) {
    if (!mayUseFallback(record)) return false;
    const fallbackSaved = await writeFallback(record, value);

    if (fallbackSaved) {
      // Prevent an older Keychain value from masking the newer fallback after a
      // failed secure write. A pending marker covers devices that cannot reset it.
      await resetKeychainRecord(record);
    }

    return fallbackSaved;
  }
};

const readSecureValue = async (
  record,
  isValid = isNonEmptyString
) => {
  if (!hasKeychain()) {
    if (!mayUseFallback(record)) return null;
  if (!mayUseFallback(record)) {
    // Derived identity data has no fallback: if Keychain read failed it simply
    // must be refetched from the API.
    return null;
  }

  const fallbackValue = await readFallback(record);
    return isValid(fallbackValue) ? fallbackValue : null;
  }

  if (record === SECURE_RECORDS.token || record === SECURE_RECORDS.user) {
    await migrateLegacyUserCredential();
  }

  if (mayUseFallback(record) && await hasPendingFallback(record)) {
    const pendingValue = await readFallback(record);

    if (isValid(pendingValue)) {
      try {
        await writeKeychainValue(record, pendingValue);
        await finishSecureWrite(record, pendingValue);
      } catch (error) {
        // The fallback remains available until secure storage recovers.
      }
      return pendingValue;
    }

    await clearFallback(record);
  }

  try {
    const credentials = await Keychain.getGenericPassword({
      service: record.service,
    });

    if (credentials?.username === record.username) {
      if (isValid(credentials.password)) {
        await finishSecureWrite(record, credentials.password);
        return credentials.password;
      }

      await resetKeychainRecord(record);
    }
  } catch (error) {
    // Fall through to the legacy/failure-safe store.
  }

  const fallbackValue = await readFallback(record);

  if (!isValid(fallbackValue)) {
    if (fallbackValue != null) {
      await clearFallback(record);
    }
    return null;
  }

  try {
    await writeKeychainValue(record, fallbackValue);
    await finishSecureWrite(record, fallbackValue);
  } catch (error) {
    // If the Keychain read or migration failed, retain the fallback for the next
    // attempt. It is only used while secure storage is genuinely unavailable.
    await writeFallback(record, fallbackValue);
  }

  return fallbackValue;
};

const clearSecureRecord = async (record) => {
  const results = await Promise.allSettled([
    resetKeychainRecord(record),
    clearFallback(record),
  ]);

  return results.every(
    (result) => result.status === 'fulfilled' && result.value !== false
  );
};

export const storageService = {
  saveToken: async (token) => {
    if (token) {
      await saveSecureValue(SECURE_RECORDS.token, token);
    }
  },

  getToken: async () =>
    readSecureValue(SECURE_RECORDS.token, isNonEmptyString),

  saveSessionToken: async (token) => {
    if (token) {
      await saveSecureValue(SECURE_RECORDS.sessionToken, token);
    }
  },

  getSessionToken: async () =>
    readSecureValue(SECURE_RECORDS.sessionToken, isNonEmptyString),

  clearSessionToken: async () => {
    await clearSecureRecord(SECURE_RECORDS.sessionToken);
  },

  saveUser: async (user) => {
    if (user) {
      await saveSecureValue(SECURE_RECORDS.user, JSON.stringify(user));
    }
  },

  getUser: async () => {
    const serializedUser = await readSecureValue(
      SECURE_RECORDS.user,
      (value) => Boolean(parseStoredObject(value))
    );
    return parseStoredObject(serializedUser);
  },

  saveImpersonationSession: async (sessionData) => {
    if (!sessionData) {
      throw new Error('An original administrator session is required.');
    }

    const saved = await saveSecureValue(
      SECURE_RECORDS.impersonation,
      JSON.stringify(sessionData)
    );

    if (!saved) {
      throw new Error(
        'Could not securely preserve the original administrator session.'
      );
    }

    return true;
  },

  getImpersonationSession: async () => {
    const serializedSession = await readSecureValue(
      SECURE_RECORDS.impersonation,
      (value) => Boolean(parseStoredObject(value))
    );
    return parseStoredObject(serializedSession);
  },

  clearImpersonationSession: async () => {
    await clearSecureRecord(SECURE_RECORDS.impersonation);
  },

  clearAll: async () => {
    if (legacyUserMigrationPromise) {
      try {
        await legacyUserMigrationPromise;
      } catch (error) {
        // Continue clearing every credential even if migration was interrupted.
      }
    }

    await Promise.allSettled(
      Object.values(SECURE_RECORDS).map(clearSecureRecord)
    );
    legacyUserMigrationComplete = false;
  },

  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      // Non-sensitive preference storage failure.
    }
  },

  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },
};
