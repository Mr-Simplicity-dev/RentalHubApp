import { translateUi as ui } from '../i18n/interfaceRuntime.cjs';
import { Platform } from 'react-native';

const pickImageFromWeb = (accept = 'image/*') =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({
        cancelled: true,
        message: ui("Image selection is not available in this environment."),
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.removeAttribute('capture');

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) {
        resolve({ cancelled: true });
        return;
      }

      resolve({
        cancelled: false,
        asset: {
          file,
          uri: URL.createObjectURL(file),
          name: file.name || 'transfer.jpg',
          type: file.type || 'image/jpeg',
        },
      });
    };

    input.click();
  });

const toDataUrl = (base64, type = 'image/jpeg') => {
  if (!base64) return '';
  if (String(base64).startsWith('data:')) return base64;
  return `data:${type};base64,${base64}`;
};

export const cameraService = {
  pickPassportPhoto: async () => {
    if (Platform.OS === 'web') {
      return pickImageFromWeb('image/*');
    }

    try {
      const { launchCamera } = require('react-native-image-picker');
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        includeBase64: false,
      });

      if (result?.didCancel) {
        return { cancelled: true };
      }

      const asset = result?.assets?.[0];

      if (!asset?.uri) {
        return {
          cancelled: true,
          message: ui("No photo was captured."),
        };
      }

      return {
        cancelled: false,
        asset: {
          uri: asset.uri,
          name: asset.fileName || 'passport.jpg',
          type: asset.type || 'image/jpeg',
        },
      };
    } catch (error) {
      return {
        cancelled: true,
        message: ui("Camera is not available on this device right now."),
      };
    }
  },

  pickTransferScreenshot: async () => {
    if (Platform.OS === 'web') {
      const result = await pickImageFromWeb('image/*');
      if (result.cancelled || !result.asset) return result;

      const proofImage = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(result.asset.file);
      });

      return { ...result, proofImage };
    }

    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
        maxWidth: 900,
        maxHeight: 1600,
        quality: 0.6,
      });

      if (result?.didCancel) {
        return { cancelled: true };
      }

      const asset = result?.assets?.[0];

      if (!asset) {
        return {
          cancelled: true,
          message: ui("No image was selected."),
        };
      }

      const proofImage = toDataUrl(asset.base64, asset.type || 'image/jpeg');

      if (!proofImage) {
        return {
          cancelled: true,
          message: ui("Could not prepare the screenshot. Try again with a smaller image."),
        };
      }

      return {
        cancelled: false,
        asset: {
          uri: asset.uri,
          name: asset.fileName || 'transfer-screenshot.jpg',
          type: asset.type || 'image/jpeg',
        },
        proofImage,
      };
    } catch (error) {
      return {
        cancelled: true,
        message: ui("Photo library is not available on this device right now."),
      };
    }
  },
};
