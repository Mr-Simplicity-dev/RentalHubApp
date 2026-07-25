import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkForAppUpdate,
  getDirectApkUrl,
  startAppUpdate,
} from '../../services/appUpdateService';
import { subscribeAppSettings } from '../../services/appSettingsService';
import { trackMobileEvent } from '../../services/mobileDiagnosticsService';
import { colors, shadows, typography } from '../../theme';

const CHECK_DELAY_MS = 4200;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

const AppUpdateIndicator = () => {
  const insets = useSafeAreaInsets();
  const [versionState, setVersionState] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateAlertsEnabled, setUpdateAlertsEnabled] = useState(true);

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
        onPress={() => startUpdate('compact_update_dot')}
        style={[styles.dotContainer, { top: Math.max(insets.top + 12, 18) }]}
      >
        <View style={styles.dotWrap}>
          <View style={styles.dotHalo} />
          <View style={styles.dot} />
        </View>
        <Icon name="sparkles-outline" size={14} color={colors.white} />
        <Text style={styles.dotLabel}>Update</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.banner, { top: Math.max(insets.top + 12, 18) }]}>
      <View style={styles.bannerIcon}>
        <Icon name="cloud-download-outline" size={21} color={colors.navy} />
      </View>
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerEyebrow}>
          {directApkAvailable ? 'DIRECT APK UPDATE' : 'APP UPDATE'}
        </Text>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerText}>
          {message}
          {versionState.latest_version ? ` Latest: ${versionState.latest_version}.` : ''}
        </Text>
        <View style={styles.bannerActions}>
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
            <Text style={styles.primaryButtonText}>
              {updating ? 'Starting...' : directApkAvailable ? 'Install update' : 'Update now'}
            </Text>
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
            <Text style={styles.secondaryButtonText}>
              {versionState.update_required ? 'Required' : 'Later'}
            </Text>
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
});

export default AppUpdateIndicator;
