import { Platform } from 'react-native';

const pickImageFromWeb = () =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({
        cancelled: true,
        message: 'Image selection is not available in this environment.',
      });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'user');

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
          name: file.name || 'passport.jpg',
          type: file.type || 'image/jpeg',
        },
      });
    };

    input.click();
  });

export const cameraService = {
  pickPassportPhoto: async () => {
    if (Platform.OS === 'web') {
      return pickImageFromWeb();
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
          message: 'No photo was captured.',
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
        message: 'Camera is not available on this device right now.',
      };
    }
  },
};
