import { Platform } from 'react-native';
import { jwtDecode } from 'jwt-decode';

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

const getSetOptions = () => {
  if (!Keychain?.ACCESS_CONTROL) {
    return {};
  }

  const options = {
    service: BIOMETRIC_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
    authenticationPrompt: {
      title: 'Enable biometric login',
      subtitle: 'Secure quick sign-in for RentalHub NG',
      description: 'Confirm your identity to save this login securely',
      cancel: 'Cancel',
    },
  };

  if (Platform.OS === 'ios' && Keychain?.ACCESSIBLE) {
    options.accessible = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  }

  return options;
};

const getGetOptions = () => {
  if (!Keychain?.ACCESS_CONTROL) {
    return {};
  }

  return {
    service: BIOMETRIC_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
    authenticationPrompt: {
      title: 'Use biometric login',
      subtitle: 'Sign in to RentalHub NG',
      description: 'Use your saved biometric login to continue',
      cancel: 'Use password',
    },
  };
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
      const hasSession = await Keychain.hasGenericPassword({ service: BIOMETRIC_SERVICE });

      return {
        available: Boolean(biometryType),
        enabled: Boolean(biometryType && hasSession),
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
    const user = sessionData?.user;
    const status = await biometricService.getStatus();

    if (!status.available) {
      return {
        success: false,
        message: 'Biometric login is not available on this device.',
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
        JSON.stringify({ token, user }),
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

      if (!isTokenActive(sessionData.token)) {
        await biometricService.clearStoredSession();
        return {
          success: false,
          message: 'Your saved biometric login has expired. Please sign in with your password again.',
        };
      }

      return {
        success: true,
        data: sessionData,
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
