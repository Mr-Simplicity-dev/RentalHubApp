import React, { useEffect, useState } from 'react';
import {ActivityIndicator,
  DeviceEventEmitter,
  StyleSheet,
  TouchableOpacity,
  View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  cancelUpdateNotification,
  checkForAppUpdate,
  getDirectApkUrl,
  startAppUpdate,
} from '../../services/appUpdateService';
import { subscribeAppSettings } from '../../services/appSettingsService';
import { trackMobileEvent } from '../../services/mobileDiagnosticsService';
import { colors, shadows, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const CHECK_DELAY_MS = 4200;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const UPDATE_PROGRESS_EVENT = 'rentalHubUpdateProgress';

const AppUpdateIndicator = ({ variant = 'floating' }) => {
  const insets = useSafeAreaInsets();
  const isInline = variant === 'inline' || variant === 'overlay';
  const isOverlay = variant === 'overlay';
  const [versionState, setVersionState] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [updateAlertsEnabled, setUpdateAlertsEnabled] = useState(true);

  // Native Android DownloadManager reports download progress through this event.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(UPDATE_PROGRESS_EVENT, (payload) => {
      setDownloadProgress(payload || null);
      if (payload?.status === 'successful') {
        setDownloadComplete(true);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAppSettings((settings) => {
      setUpdateAlertsEnabled(settings.updateAlerts !== false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    let intervalId;

    const checkForUpdate = async () => {
      try {
        const nextState = await checkForAppUpdate();
        if (!active) return;
        setVersionState(nextState?.update_available ? nextState : null);
        if (nextState?.update_available) {
          setDismissed(false);
        } else {
          // Already up to date — clear any update notification left from a previous download.
          cancelUpdateNotification().catch(() => {});
        }
      } catch {
        if (active) {
          setVersionState(null);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      checkForUpdate();
      intervalId = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    }, CHECK_DELAY_MS);

    return () => {
      active = false;
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const startUpdate = async (source) => {
    if (!versionState?.update_available || updating) return;
    setUpdating(true);
    setDownloadProgress(null);
    setDownloadComplete(false);
    try {
      await startAppUpdate(versionState);
    } catch (error) {
      trackMobileEvent('app_update_start_failed', {
        latest_version: versionState.latest_version,
        source,
        message: error?.message || 'Unknown update error',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!updateAlertsEnabled || !versionState?.update_available) {
    return null;
  }

  const directApkAvailable = Boolean(getDirectApkUrl(versionState));
  const title = versionState.update_required
    ? 'Important RentalHub update'
    : 'New RentalHub update available';
  const message =
    versionState.message ||
    'A newer RentalHub app is available. Update when you are ready.';

  if (dismissed) {
    return (
      <TouchableOpacity
        accessibilityLabel="RentalHub app update available"
        accessibilityRole="button"
        activeOpacity={0.86}
        onPress={() => setDismissed(false)}
        style={[
          styles.dotContainer,
          isOverlay
            ? [styles.dotContainerOverlay, { bottom: insets.bottom + 62 }]
            : isInline
              ? styles.dotContainerInline
              : { top: Math.max(insets.top + 12, 18) },
        ]}
      >
        <View style={styles.dotWrap}>
          <View style={styles.dotHalo} />
          <View style={styles.dot} />
        </View>
        <Icon name="sparkles-outline" size={14} color={colors.white} />
        <AppText style={styles.dotLabel}>Update</AppText>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.banner, isOverlay ? styles.bannerOverlay : isInline ? styles.bannerInline : { top: Math.max(insets.top + 12, 18) }]}>
      <View style={[styles.bannerIcon, isInline ? styles.bannerIconInline : null]}>
        <Icon name="cloud-download-outline" size={21} color={colors.navy} />
      </View>
      <View style={[styles.bannerCopy, isInline ? styles.bannerCopyInline : null]}>
        <AppText style={[styles.bannerEyebrow, isInline ? styles.textCenter : null]}>
          {directApkAvailable ? 'DIRECT APK UPDATE' : 'APP UPDATE'}
        </AppText>
        <AppText style={[styles.bannerTitle, isInline ? styles.textCenter : null]}>{title}</AppText>
        <AppText style={[styles.bannerText, isInline ? styles.textCenter : null]}>
          {message}
          {versionState.latest_version ? ` Latest: ${versionState.latest_version}.` : ''}
        </AppText>
        {downloadComplete ? (
          <View style={[styles.progressWrap, isInline ? styles.progressWrapInline : null]}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <AppText style={[styles.progressText, isInline ? styles.textCenter : null]}>Download complete — opening installer…</AppText>
          </View>
        ) : updating && downloadProgress ? (
          <View style={[styles.progressWrap, isInline ? styles.progressWrapInline : null]}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, downloadProgress.progress || 0))}%` }]} />
            </View>
            <AppText style={[styles.progressText, isInline ? styles.textCenter : null]}>
              {downloadProgress.indeterminate
                ? 'Downloading update…'
                : `Downloading update… ${downloadProgress.progress || 0}%`}
            </AppText>
          </View>
        ) : null}
        <View style={[styles.bannerActions, isInline ? styles.bannerActionsInline : null]}>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={updating}
            onPress={() => startUpdate('update_banner')}
            style={[styles.primaryButton, updating ? styles.disabled : null]}
          >
            {updating ? (
              <ActivityIndicator color={colors.navy} size="small" />
            ) : (
              <Icon name="download-outline" size={15} color={colors.navy} />
            )}
            <AppText style={styles.primaryButtonText}>
              {updating ? 'Starting...' : directApkAvailable ? 'Install update' : 'Update now'}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={updating || versionState.update_required}
            onPress={() => {
              setDismissed(true);
              trackMobileEvent('app_update_banner_dismissed', {
                latest_version: versionState.latest_version,
                update_required: Boolean(versionState.update_required),
              });
            }}
            style={[
              styles.secondaryButton,
              versionState.update_required ? styles.secondaryDisabled : null,
            ]}
          >
            <AppText style={styles.secondaryButtonText}>
              {versionState.update_required ? 'Required' : 'Later'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.navy,
    borderColor: 'rgba(255, 201, 40, 0.42)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    left: 14,
    padding: 14,
    position: 'absolute',
    right: 14,
    zIndex: 8500,
    ...shadows.soft,
  },
  bannerIcon: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bannerCopy: {
    flex: 1,
  },
  bannerEyebrow: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  bannerTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 16,
    marginTop: 3,
  },
  bannerText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 5,
  },
  bannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 11,
  },
  progressWrap: {
    marginTop: 10,
  },
  progressTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.gold,
    borderRadius: 999,
    height: 6,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: typography.semibold,
    fontSize: 12,
    marginTop: 6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryDisabled: {
    opacity: 0.62,
  },
  secondaryButtonText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  dotContainer: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderColor: 'rgba(255, 201, 40, 0.38)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    right: 14,
    zIndex: 8500,
    ...shadows.soft,
  },
  dotWrap: {
    alignItems: 'center',
    height: 14,
    justifyContent: 'center',
    width: 14,
  },
  dotHalo: {
    backgroundColor: 'rgba(255, 201, 40, 0.22)',
    borderRadius: 7,
    height: 14,
    position: 'absolute',
    width: 14,
  },
  dot: {
    backgroundColor: colors.gold,
    borderColor: colors.white,
    borderRadius: 5,
    borderWidth: 1,
    height: 9,
    width: 9,
  },
  dotLabel: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 0,
  },
  disabled: {
    opacity: 0.68,
  },
  bannerInline: {
    alignItems: 'center',
    flexDirection: 'column',
    left: 0,
    marginTop: 16,
    position: 'relative',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  bannerOverlay: {
    alignItems: 'center',
    bottom: 22,
    flexDirection: 'column',
    left: 18,
    position: 'absolute',
    right: 18,
    zIndex: 9000,
  },
  dotContainerOverlay: {
    alignSelf: 'center',
    bottom: 62,
    position: 'absolute',
    right: 'auto',
    zIndex: 9000,
  },
  bannerIconInline: {
    alignSelf: 'center',
  },
  bannerCopyInline: {
    alignItems: 'center',
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
  },
  bannerActionsInline: {
    justifyContent: 'center',
  },
  progressWrapInline: {
    alignSelf: 'stretch',
    width: '100%',
  },
  textCenter: {
    textAlign: 'center',
  },
  dotContainerInline: {
    alignSelf: 'flex-start',
    marginTop: 16,
    position: 'relative',
    right: 0,
    top: 0,
    zIndex: 1,
  },
});

export default AppUpdateIndicator;
