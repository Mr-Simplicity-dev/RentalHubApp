import { Platform } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import { storageService } from './storageService';

const BIOMETRIC_SERVICE = 'com.rentalhubng.biometric.session';
const isWeb = Platform.OS === 'web';

let Keychain = null;

if (!isWeb) {
  try {
    Keychain = require('react-native-keychain');
  } catch (error) {
    Keychain = null;
  }
}

const getBiometricLabel = (biometryType) => {
  if (!Keychain?.BIOMETRY_TYPE) {
    return 'Biometrics';
  }

  switch (biometryType) {
    case Keychain.BIOMETRY_TYPE.FACE_ID:
      return 'Face ID';
    case Keychain.BIOMETRY_TYPE.TOUCH_ID:
      return 'Touch ID';
    case Keychain.BIOMETRY_TYPE.FINGERPRINT:
      return 'Fingerprint';
    case Keychain.BIOMETRY_TYPE.FACE:
      return 'Face Unlock';
    case Keychain.BIOMETRY_TYPE.IRIS:
      return 'Iris';
    case Keychain.BIOMETRY_TYPE.OPTIC_ID:
      return 'Optic ID';
    default:
      return 'Biometrics';
  }
};

const isTokenActive = (token) => {
  if (!token) {
    return false;
  }

  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const getBiometricAccessControl = () => {
  const accessControl = Keychain?.ACCESS_CONTROL || {};
  return (
    accessControl.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE ||
    accessControl.BIOMETRY_CURRENT_SET ||
    accessControl.BIOMETRY_ANY_OR_DEVICE_PASSCODE ||
    accessControl.BIOMETRY_ANY ||
    null
  );
};

const getSetOptions = () => {
  const biometricAccessControl = getBiometricAccessControl();

  const options = {
    service: BIOMETRIC_SERVICE,
    authenticationPrompt: {
      title: 'Enable biometric login',
      subtitle: 'Secure quick sign-in for RentalHub NG',
      description: 'Confirm your identity to save this login securely',
      cancel: 'Cancel',
    },
  };

  if (biometricAccessControl) {
    options.accessControl = biometricAccessControl;
  }

  if (Platform.OS === 'ios' && Keychain?.ACCESSIBLE) {
    options.accessible = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  }

  return options;
};

const getGetOptions = () => {
  const biometricAccessControl = getBiometricAccessControl();

  const options = {
    service: BIOMETRIC_SERVICE,
    authenticationPrompt: {
      title: 'Use biometric login',
      subtitle: 'Sign in to RentalHub NG',
      description: 'Use your saved biometric login to continue',
      cancel: 'Use password',
    },
  };

  if (biometricAccessControl) {
    options.accessControl = biometricAccessControl;
  }

  return options;
};

const parseSession = (password) => {
  if (!password) {
    return null;
  }

  try {
    return JSON.parse(password);
  } catch {
    return null;
  }
};

const normalizeErrorMessage = (error, fallbackMessage) => {
  const message = error?.message || fallbackMessage;

  if (/cancel/i.test(message)) {
    return 'Biometric sign-in was cancelled.';
  }

  if (/lockout/i.test(message)) {
    return 'Biometric login is temporarily locked. Use your password and try again later.';
  }

  return message;
};

const getUserIdentity = (user) => {
  const identity = user?.id ?? user?.user_id ?? user?.email;
  return identity == null ? null : String(identity).trim().toLowerCase();
};

export const biometricService = {
  getBiometricLabel,

  getStatus: async () => {
    if (!Keychain) {
      return {
        available: false,
        enabled: false,
        biometryType: null,
        label: 'Biometrics',
      };
    }

    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      const hasAccessControl = Boolean(getBiometricAccessControl());
      const hasSession = await Keychain.hasGenericPassword({ service: BIOMETRIC_SERVICE });

      return {
        available: Boolean(biometryType && hasAccessControl),
        enabled: Boolean(biometryType && hasAccessControl && hasSession),
        biometryType,
        label: getBiometricLabel(biometryType),
      };
    } catch {
      return {
        available: false,
        enabled: false,
        biometryType: null,
        label: 'Biometrics',
      };
    }
  },

  enableForSession: async (sessionData) => {
    const token = sessionData?.token;
    const sessionToken = sessionData?.session_token || sessionData?.sessionToken;
    const user = sessionData?.user;
    const status = await biometricService.getStatus();
    const hasAccessControl = Boolean(getBiometricAccessControl());

    if (!status.available) {
      return {
        success: false,
        message: 'Biometric login is not available on this device.',
      };
    }

    if (!hasAccessControl) {
      return {
        success: false,
        message: 'Secure biometric storage is not available on this device.',
      };
    }

    if (!token || !user) {
      return {
        success: false,
        message: 'No active session is available to secure for biometric login.',
      };
    }

    try {
      await Keychain.setGenericPassword(
        user.email || user.id || 'rentalhub-user',
        JSON.stringify({ token, session_token: sessionToken, user }),
        getSetOptions()
      );

      return {
        success: true,
        biometryType: status.biometryType,
        label: status.label,
      };
    } catch (error) {
      return {
        success: false,
        message: normalizeErrorMessage(error, 'Unable to enable biometric login right now.'),
      };
    }
  },

  unlockSession: async () => {
    const status = await biometricService.getStatus();

    if (!status.enabled) {
      return {
        success: false,
        message: 'Biometric login has not been enabled on this device yet.',
      };
    }

    try {
      const credentials = await Keychain.getGenericPassword(getGetOptions());

      if (!credentials) {
        return {
          success: false,
          message: 'No biometric login was found for this device.',
        };
      }

      const sessionData = parseSession(credentials.password);

      if (!sessionData?.token || !sessionData?.user) {
        await biometricService.clearStoredSession();
        return {
          success: false,
          message: 'Saved biometric login data is invalid. Please sign in with your password again.',
        };
      }

      const [currentToken, currentSessionToken, currentUser] = await Promise.all([
        storageService.getToken(),
        storageService.getSessionToken(),
        storageService.getUser(),
      ]);

      const storedIdentity = getUserIdentity(sessionData.user);
      const currentIdentity = getUserIdentity(currentUser);

      if (storedIdentity && currentIdentity && storedIdentity !== currentIdentity) {
        await biometricService.clearStoredSession();
        return {
          success: false,
          message: 'This biometric login belongs to a different account. Sign in with your password to enable it again.',
        };
      }

      if (
        !currentUser ||
        (!isTokenActive(currentToken) && !isTokenActive(currentSessionToken))
      ) {
        await biometricService.clearStoredSession();
        return {
          success: false,
          message: 'Your saved biometric login has expired. Please sign in with your password again.',
        };
      }

      return {
        success: true,
        data: {
          token: currentToken,
          session_token: currentSessionToken,
          user: currentUser,
        },
        biometryType: status.biometryType,
        label: status.label,
      };
    } catch (error) {
      const message = normalizeErrorMessage(error, 'Biometric login failed.');
      return {
        success: false,
        cancelled: /cancel/i.test(message),
        message,
      };
    }
  },

  clearStoredSession: async () => {
    if (!Keychain) {
      return;
    }

    try {
      await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
    } catch (error) {
      console.error('Error clearing biometric session:', error);
    }
  },
};
