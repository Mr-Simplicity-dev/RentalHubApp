import { Alert, Linking, NativeModules, Platform } from 'react-native';
import { checkMobileAppVersion, trackMobileEvent } from './mobileDiagnosticsService';

const { RentalHubUpdate } = NativeModules;

const APK_EXTENSION_PATTERN = /\.apk(?:$|[?#])/i;

export const getDirectApkUrl = (versionState = {}) => {
  const candidates = [
    versionState.apk_url,
    versionState.direct_apk_url,
    versionState.download_url,
    versionState.store_url,
  ];

  return candidates.find((candidate) => APK_EXTENSION_PATTERN.test(String(candidate || ''))) || '';
};

export const getUpdateUrl = (versionState = {}) =>
  getDirectApkUrl(versionState) ||
  versionState.download_url ||
  versionState.store_url ||
  '';

export const checkForAppUpdate = async () => {
  const response = await checkMobileAppVersion();
  return response?.data || null;
};

export const openInstallPermissionSettings = async () => {
  if (Platform.OS === 'android' && RentalHubUpdate?.openInstallPermissionSettings) {
    return RentalHubUpdate.openInstallPermissionSettings();
  }
  return false;
};

export const startAppUpdate = async (versionState = {}) => {
  const directApkUrl = getDirectApkUrl(versionState);
  const fallbackUrl = getUpdateUrl(versionState);
  const latestVersion = versionState.latest_version || 'latest';

  if (Platform.OS === 'android' && directApkUrl && RentalHubUpdate?.downloadAndInstallApk) {
    const canInstall = RentalHubUpdate?.canInstallUnknownApps
      ? await RentalHubUpdate.canInstallUnknownApps()
      : true;

    if (!canInstall) {
      Alert.alert(
        'Allow RentalHub updates',
        'Android needs your permission before RentalHub can install an APK update directly. Turn on “Allow from this source”, then return to RentalHub and tap Update again.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Open settings',
            onPress: () => {
              openInstallPermissionSettings().catch(() => {});
            },
          },
        ]
      );
      trackMobileEvent('app_update_install_permission_needed', {
        latest_version: latestVersion,
        source: 'native_direct_apk',
      });
      return { started: false, reason: 'install-permission-required' };
    }

    await RentalHubUpdate.downloadAndInstallApk(
      directApkUrl,
      `rentalhub-${latestVersion}.apk`
    );
    trackMobileEvent('app_update_direct_apk_started', {
      latest_version: latestVersion,
      source: 'native_direct_apk',
    });
    return { started: true, method: 'direct-apk' };
  }

  if (fallbackUrl) {
    await Linking.openURL(fallbackUrl);
    trackMobileEvent('app_update_external_link_opened', {
      latest_version: latestVersion,
      source: directApkUrl ? 'direct_apk_fallback' : 'external_update_url',
    });
    return { started: true, method: 'external-link' };
  }

  Alert.alert(
    'Update link unavailable',
    'The latest RentalHub app download link has not been configured yet.'
  );
  return { started: false, reason: 'missing-update-url' };
};
