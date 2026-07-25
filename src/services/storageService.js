import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_SERVICE = 'com.rentalhubng.auth.token';
const SESSION_TOKEN_SERVICE = 'com.rentalhubng.auth.session-token';
const USER_SERVICE = 'com.rentalhubng.auth.user';
const IMPERSONATION_SERVICE = 'com.rentalhubng.auth.impersonation-original';
const IMPERSONATION_STORAGE_KEY = 'impersonation_original_session';

let Keychain = null;
if (Platform.OS !== 'web') {
  try {
    Keychain = require('react-native-keychain');
  } catch (error) {
    Keychain = null;
  }
}

const getKeychainOptions = (service) => ({
  service,
  accessible: Keychain?.ACCESSIBLE?.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

export const storageService = {
  saveToken: async (token) => {
    if (!token) {
      return;
    }

    try {
      if (Keychain) {
        await Keychain.setGenericPassword('token', token, getKeychainOptions(TOKEN_SERVICE));
      }
    } catch (error) {
      // Keychain is preferred, but AsyncStorage below remains a resilient fallback.
    }

    try {
      await AsyncStorage.setItem('token', token);
    } catch (fallbackError) {
      // both storage methods failed
    }
  },

  getToken: async () => {
    try {
      if (Keychain) {
        const credentials = await Keychain.getGenericPassword({
          service: TOKEN_SERVICE,
        });
        if (credentials?.username === 'token') {
          return credentials.password;
        }
      }
    } catch (error) {
      // Keychain read failed, fall through to AsyncStorage
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && Keychain) {
        await Keychain.setGenericPassword('token', token, getKeychainOptions(TOKEN_SERVICE));
      }
      return token;
    } catch (error) {
      return null;
    }
  },

  saveSessionToken: async (token) => {
    if (!token) {
      return;
    }

    try {
      if (Keychain) {
        await Keychain.setGenericPassword(
          'session_token',
          token,
          getKeychainOptions(SESSION_TOKEN_SERVICE)
        );
      }
    } catch (error) {
      // Keychain is preferred, but AsyncStorage below remains a resilient fallback.
    }

    try {
      await AsyncStorage.setItem('session_token', token);
    } catch (fallbackError) {
      // both storage methods failed
    }
  },

  getSessionToken: async () => {
    try {
      if (Keychain) {
        const credentials = await Keychain.getGenericPassword({
          service: SESSION_TOKEN_SERVICE,
        });
        if (credentials?.username === 'session_token') {
          return credentials.password;
        }
      }
    } catch (error) {
      // Keychain read failed, fall through to AsyncStorage
    }
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token && Keychain) {
        await Keychain.setGenericPassword(
          'session_token',
          token,
          getKeychainOptions(SESSION_TOKEN_SERVICE)
        );
      }
      return token;
    } catch (error) {
      return null;
    }
  },

  clearSessionToken: async () => {
    try {
      if (Keychain) {
        await Keychain.resetGenericPassword({ service: SESSION_TOKEN_SERVICE });
      }
    } catch (error) {
      // ignore
    }
    try {
      await AsyncStorage.removeItem('session_token');
    } catch (error) {
      // ignore
    }
  },

  saveUser: async (user) => {
    if (!user) {
      return;
    }

    const serializedUser = JSON.stringify(user);

    try {
      if (Keychain) {
        await Keychain.setGenericPassword('user', serializedUser, getKeychainOptions(USER_SERVICE));
      }
    } catch (error) {
      // Keychain is preferred, but AsyncStorage below remains a resilient fallback.
    }

    try {
      await AsyncStorage.setItem('user', serializedUser);
    } catch (fallbackError) {
      // both storage methods failed
    }
  },

  getUser: async () => {
    try {
      if (Keychain) {
        const credentials = await Keychain.getGenericPassword({
          service: USER_SERVICE,
        });
        if (credentials && credentials.username === 'user') {
          return JSON.parse(credentials.password);
        }

        const legacyCredentials = await Keychain.getGenericPassword({
          service: TOKEN_SERVICE,
        });
        if (legacyCredentials?.username === 'user') {
          return JSON.parse(legacyCredentials.password);
        }
      }
    } catch (error) {
      // Keychain read failed, fall through to AsyncStorage
    }
    try {
      const user = await AsyncStorage.getItem('user');
      if (user && Keychain) {
        await Keychain.setGenericPassword('user', user, getKeychainOptions(USER_SERVICE));
      }
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  },

  saveImpersonationSession: async (sessionData) => {
    if (!sessionData) {
      throw new Error('An original administrator session is required.');
    }
    const serialized = JSON.stringify(sessionData);
    let keychainSaved = false;
    let fallbackSaved = false;

    try {
      if (Keychain) {
        await Keychain.setGenericPassword(
          'original_session',
          serialized,
          getKeychainOptions(IMPERSONATION_SERVICE)
        );
        keychainSaved = true;
      }
    } catch (error) {
      // Keychain is preferred; AsyncStorage remains the fallback.
    }

    try {
      await AsyncStorage.setItem(IMPERSONATION_STORAGE_KEY, serialized);
      fallbackSaved = true;
    } catch (error) {
      // ignore
    }

    if (!keychainSaved && !fallbackSaved) {
      throw new Error('Could not securely preserve the original administrator session.');
    }

    return true;
  },

  getImpersonationSession: async () => {
    try {
      if (Keychain) {
        const credentials = await Keychain.getGenericPassword({
          service: IMPERSONATION_SERVICE,
        });
        if (credentials?.username === 'original_session') {
          return JSON.parse(credentials.password);
        }
      }
    } catch (error) {
      // fall through to AsyncStorage
    }

    try {
      const serialized = await AsyncStorage.getItem(IMPERSONATION_STORAGE_KEY);
      return serialized ? JSON.parse(serialized) : null;
    } catch (error) {
      return null;
    }
  },

  clearImpersonationSession: async () => {
    try {
      if (Keychain) {
        await Keychain.resetGenericPassword({ service: IMPERSONATION_SERVICE });
      }
    } catch (error) {
      // ignore
    }
    try {
      await AsyncStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    } catch (error) {
      // ignore
    }
  },

  clearAll: async () => {
    try {
      if (Keychain) {
        await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
        await Keychain.resetGenericPassword({ service: SESSION_TOKEN_SERVICE });
        await Keychain.resetGenericPassword({ service: USER_SERVICE });
        await Keychain.resetGenericPassword({ service: IMPERSONATION_SERVICE });
      }
    } catch (error) {
      // ignore
    }
    try {
      await AsyncStorage.multiRemove([
        'token',
        'session_token',
        'user',
        IMPERSONATION_STORAGE_KEY,
      ]);
    } catch (error) {
      // ignore
    }
  },

  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      // storage failure
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
