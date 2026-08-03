import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { useTour } from '../../context/TourContext';
import { useLanguage } from '../../context/LanguageContext';
import { userService } from '../../services/userService';
import { getErrorMessage } from '../../utils/http';
import {
  ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
} from '../../components/dashboard/DashboardKit';
import { colors, typography } from '../../theme';
import {
  DEFAULT_APP_SETTINGS,
  getSyncedAppSettings,
  resetAppSettings,
  saveAppSettings,
  syncNotificationPreferences,
} from '../../services/appSettingsService';
import {
  checkMobileAppVersion,
  getMobileAppVersion,
  trackMobileEvent,
} from '../../services/mobileDiagnosticsService';
import { getDirectApkUrl, startAppUpdate } from '../../services/appUpdateService';

import AppText from '../../components/common/AppText';
const labels = {
  pushMessages: 'Messages',
  pushPayments: 'Payments',
  pushApplications: 'Applications',
  pushBookings: 'Bookings',
  adminAlerts: 'Admin work alerts',
  updateAlerts: 'App update alerts',
  notificationBadges: 'App icon badges',
  weakNetworkWarnings: 'Weak-network warnings',
  largerText: 'Larger text',
  reduceMotion: 'Reduce motion',
};

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { replayTour } = useTour();
  const { language, languages, setLanguage, t } = useLanguage();
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [versionState, setVersionState] = useState(null);
  const [checkingVersion, setCheckingVersion] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    let active = true;
    getSyncedAppSettings()
      .then((nextSettings) => {
        if (!active) return;
        setSettings(nextSettings);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const checkForUpdates = async () => {
    setCheckingVersion(true);
    try {
      const response = await checkMobileAppVersion();
      const nextVersionState = response?.data || null;
      setVersionState(nextVersionState);
      trackMobileEvent('app_version_checked', {
        screen: 'Settings',
        update_available: Boolean(nextVersionState?.update_available),
        update_required: Boolean(nextVersionState?.update_required),
      });
      Toast.show({
        type: nextVersionState?.update_available ? 'info' : 'success',
        text1: nextVersionState?.message || 'Version checked',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Version check failed',
        text2: getErrorMessage(error, 'Could not check for updates'),
      });
    } finally {
      setCheckingVersion(false);
    }
  };

  const openStoreLink = async () => {
    if (!versionState) {
      Toast.show({
        type: 'info',
        text1: 'Check updates first',
        text2: 'Run the update check before starting an app update.',
      });
      return;
    }
    try {
      const result = await startAppUpdate(versionState);
      if (result?.reason === 'install-permission-required') {
        Toast.show({
          type: 'info',
          text1: 'Permission needed',
          text2: 'Enable APK installs for RentalHub, then tap update again.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not start update',
        text2: getErrorMessage(error, 'Try again when your connection is stable.'),
      });
    }
  };

  const updateSetting = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await saveAppSettings(next);
    trackMobileEvent('setting_changed', {
      setting: key,
      enabled: Boolean(value),
      screen: 'Settings',
    });
    if (key.startsWith('push') || key === 'adminAlerts') {
      try {
        const synced = await syncNotificationPreferences(next);
        setSettings(synced);
        Toast.show({ type: 'success', text1: 'Preference synced' });
        return;
      } catch {
        Toast.show({
          type: 'info',
          text1: 'Saved on this device',
          text2: 'Server sync will retry when your connection is stable.',
        });
        return;
      }
    }
    Toast.show({ type: 'success', text1: 'Setting saved' });
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Do you want to sign out of this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const resetLocalSettings = () => {
    Alert.alert('Reset app settings', 'This resets local notification and tour preferences on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          const next = await resetAppSettings();
          setSettings(next);
          Toast.show({ type: 'success', text1: 'Local settings reset' });
        },
      },
    ]);
  };

  const selectLanguage = async (nextLanguage) => {
    if (nextLanguage === language) return;
    const result = await setLanguage(nextLanguage);
    const nextSettings = { ...settings, language: result.language };
    setSettings(nextSettings);
    await saveAppSettings(nextSettings);
    Toast.show({ type: 'success', text1: t('settings.languageSaved') });
    if (result.restartRequired) {
      Alert.alert(
        t('settings.languageRestartTitle'),
        t('settings.languageRestart'),
        [{ text: t('settings.ok') }]
      );
    }
  };

  const closeDeleteModal = () => {
    if (deletingAccount) return;
    setDeleteModalVisible(false);
    setDeletePassword('');
  };

  const confirmDeleteAccount = () => {
    if (!deletePassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Password required',
        text2: 'Enter your current password to continue.',
      });
      return;
    }

    Alert.alert(
      'Permanently delete account?',
      'Your account will be deactivated. Active listings, tenancies, disputes or pending payments may block deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await userService.deleteAccount(deletePassword);
              trackMobileEvent('account_deleted', { screen: 'Settings' });
              Toast.show({
                type: 'success',
                text1: 'Account deleted',
                text2: 'You have been signed out of this device.',
              });
              setDeleteModalVisible(false);
              setDeletePassword('');
              logout();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Deletion blocked',
                text2: getErrorMessage(error, 'Could not delete your account'),
              });
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const notificationKeys = [
    'pushMessages',
    'pushPayments',
    'pushApplications',
    'pushBookings',
    ...(String(user?.user_type || '').includes('admin') ? ['adminAlerts'] : []),
  ];

  return (
    <DashboardScreen>
      <DashboardHero
        eyebrow="APP SETTINGS"
        title="Control your RentalHub app"
        subtitle="Manage notifications, privacy shortcuts, security actions and the mobile tour from one native screen."
        icon="settings-outline"
        tourTarget="tour_settings"
      />

      <DashboardNotice
        title="Synced preferences"
        message="Notification switches are saved on this device and synced to your account when the server is reachable."
      />

      <DashboardSection
        title={t('settings.languageSection')}
        subtitle={t('settings.languageHelp')}
      >
        <View accessibilityRole="radiogroup" style={styles.languageGrid}>
          {languages.map((option) => {
            const selected = language === option.code;
            return (
              <TouchableOpacity
                accessibilityLabel={`${option.label}: ${option.nativeLabel}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option.code}
                onPress={() => selectLanguage(option.code)}
                style={[
                  styles.languageOption,
                  selected && styles.languageOptionSelected,
                ]}
              >
                <AppText
                  style={[
                    styles.languageOptionText,
                    selected && styles.languageOptionTextSelected,
                  ]}
                >
                  {option.nativeLabel}
                </AppText>
                {selected ? (
                  <Icon name="checkmark-circle" size={18} color={colors.blue} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </DashboardSection>

      <DashboardSection title="Notification preferences">
        {notificationKeys.map((key) => (
          <View key={key} style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <AppText style={styles.switchTitle}>{labels[key]}</AppText>
              <AppText style={styles.switchSubtitle}>Allow native alerts for {labels[key].toLowerCase()}.</AppText>
            </View>
            <Switch
              value={settings[key]}
              onValueChange={(value) => updateSetting(key, value)}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={settings[key] ? colors.blue : colors.white}
            />
          </View>
        ))}
      </DashboardSection>

      <DashboardSection title="Security and privacy">
        <ActionRow
          title="Profile and biometric login"
          subtitle="Update profile, verification photo and biometric unlock."
          icon="finger-print-outline"
          onPress={() => navigation.navigate('Profile')}
        />
        <ActionRow
          title="Privacy Policy"
          subtitle="Review how RentalHub handles and protects personal data."
          icon="lock-closed-outline"
          onPress={() => navigation.navigate('PublicInfo', { page: 'privacy' })}
        />
        <ActionRow
          title="Terms summary"
          subtitle="Review the mobile terms summary."
          icon="document-text-outline"
          onPress={() => navigation.navigate('PublicInfo', { page: 'terms' })}
        />
      </DashboardSection>

      <DashboardSection title="App experience">
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <AppText style={styles.switchTitle}>{labels.weakNetworkWarnings}</AppText>
            <AppText style={styles.switchSubtitle}>Show a banner when API requests detect poor connectivity.</AppText>
          </View>
          <Switch
            value={settings.weakNetworkWarnings}
            onValueChange={(value) => updateSetting('weakNetworkWarnings', value)}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={settings.weakNetworkWarnings ? colors.blue : colors.white}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <AppText style={styles.switchTitle}>{labels.updateAlerts}</AppText>
            <AppText style={styles.switchSubtitle}>Show a native banner or dot when a newer RentalHub APK is available.</AppText>
          </View>
          <Switch
            value={settings.updateAlerts}
            onValueChange={(value) => updateSetting('updateAlerts', value)}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={settings.updateAlerts ? colors.blue : colors.white}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <AppText style={styles.switchTitle}>{labels.notificationBadges}</AppText>
            <AppText style={styles.switchSubtitle}>Allow RentalHub to show home-screen badge counts for unread account activity.</AppText>
          </View>
          <Switch
            value={settings.notificationBadges}
            onValueChange={(value) => updateSetting('notificationBadges', value)}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={settings.notificationBadges ? colors.blue : colors.white}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <AppText style={styles.switchTitle}>{labels.largerText}</AppText>
            <AppText style={styles.switchSubtitle}>Increase key dashboard, tour and control text across the app.</AppText>
          </View>
          <Switch
            value={settings.largerText}
            onValueChange={(value) => updateSetting('largerText', value)}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={settings.largerText ? colors.blue : colors.white}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <AppText style={styles.switchTitle}>{labels.reduceMotion}</AppText>
            <AppText style={styles.switchSubtitle}>Reduce splash and guided-tour animations for calmer navigation.</AppText>
          </View>
          <Switch
            value={settings.reduceMotion}
            onValueChange={(value) => updateSetting('reduceMotion', value)}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={settings.reduceMotion ? colors.blue : colors.white}
          />
        </View>
        <ActionRow
          title="Replay app tour"
          subtitle="Open the guided mobile walkthrough again."
          icon="map-outline"
          onPress={replayTour}
        />
        <ActionRow
          title="Reset local settings"
          subtitle="Restore this device’s app settings to default."
          icon="refresh-outline"
          onPress={resetLocalSettings}
        />
      </DashboardSection>

      <DashboardSection title="App updates">
        <View style={styles.versionCard}>
          <View style={styles.versionTop}>
            <View style={styles.versionCopy}>
              <AppText style={styles.versionTitle}>RentalHub app version</AppText>
              <AppText style={styles.versionMeta}>Installed: {getMobileAppVersion() || 'Unknown'}</AppText>
              {versionState?.latest_version ? (
                <AppText style={styles.versionMeta}>Latest: {versionState.latest_version}</AppText>
              ) : null}
            </View>
            <View
              style={[
                styles.versionBadge,
                versionState?.update_required ? styles.versionBadgeDanger : null,
                versionState?.update_available && !versionState?.update_required ? styles.versionBadgeWarning : null,
              ]}
            >
              <AppText 
                style={[
                  styles.versionBadgeText,
                  versionState?.update_required ? styles.versionBadgeTextDanger : null,
                  versionState?.update_available && !versionState?.update_required ? styles.versionBadgeTextWarning : null,
                ]}
              >
                {versionState?.update_required
                  ? 'Required'
                  : versionState?.update_available
                    ? 'Update'
                    : 'Current'}
              </AppText>
            </View>
          </View>
          <AppText style={styles.versionMessage}>
            {versionState?.message || 'Check whether a newer app version is available before release testing.'}
          </AppText>
          <View style={styles.versionActions}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={checkingVersion}
              onPress={checkForUpdates}
              style={styles.versionButton}
            >
              {checkingVersion ? <ActivityIndicator color={colors.blue} /> : <Icon name="refresh-outline" size={15} color={colors.blue} />}
              <AppText style={styles.versionButtonText}>{checkingVersion ? 'Checking...' : 'Check update'}</AppText>
            </TouchableOpacity>
            {versionState?.update_available ? (
              <TouchableOpacity accessibilityRole="button" onPress={openStoreLink} style={styles.versionButtonPrimary}>
                <Icon name="download-outline" size={15} color={colors.white} />
                <AppText style={styles.versionButtonPrimaryText}>
                  {getDirectApkUrl(versionState) ? 'Install update' : 'Update now'}
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </DashboardSection>

      <DashboardSection title="Account">
        <ActionRow
          title="Account deletion"
          subtitle="Delete this account after password confirmation and server safety checks."
          icon="trash-outline"
          badge="Secure"
          onPress={() => setDeleteModalVisible(true)}
        />
        <ActionRow
          title="Logout"
          subtitle="Sign out from this device."
          icon="log-out-outline"
          onPress={confirmLogout}
        />
      </DashboardSection>
      <Modal visible={deleteModalVisible} transparent animationType="slide" onRequestClose={closeDeleteModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeDeleteModal}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <AppText style={styles.modalTitle}>Delete account</AppText>
                <AppText style={styles.modalSubtitle}>This is protected by password confirmation.</AppText>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close account deletion"
                accessibilityRole="button"
                disabled={deletingAccount}
                onPress={closeDeleteModal}
              >
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Icon name="warning-outline" size={20} color={colors.danger} />
              <AppText style={styles.warningText}>
                We will not delete accounts with active property listings, tenancies, ongoing disputes or pending payments.
              </AppText>
            </View>

            <AppText style={styles.inputLabel}>Current password</AppText>
            <TextInput
              accessibilityLabel="Current password for account deletion"
              autoCapitalize="none"
              onChangeText={setDeletePassword}
              placeholder="Enter current password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
              value={deletePassword}
            />

            <TouchableOpacity
              accessibilityRole="button"
              disabled={deletingAccount}
              onPress={confirmDeleteAccount}
              style={[styles.deleteButton, deletingAccount ? styles.disabled : null]}
            >
              {deletingAccount ? <ActivityIndicator color={colors.white} /> : <Icon name="trash-outline" size={18} color={colors.white} />}
              <AppText style={styles.deleteButtonText}>{deletingAccount ? 'Deleting...' : 'Delete account'}</AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  languageOption: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  languageOptionSelected: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  languageOptionText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  languageOptionTextSelected: {
    color: colors.blue,
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  switchCopy: {
    flex: 1,
  },
  switchTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  switchSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 3,
  },
  versionCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  versionTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  versionCopy: {
    flex: 1,
  },
  versionTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  versionMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  versionBadge: {
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  versionBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  versionBadgeDanger: {
    backgroundColor: '#FEF2F2',
  },
  versionBadgeText: {
    color: colors.success,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  versionBadgeTextWarning: {
    color: '#92400E',
  },
  versionBadgeTextDanger: {
    color: colors.danger,
  },
  versionMessage: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  versionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 12,
  },
  versionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  versionButtonText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  versionButtonPrimary: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  versionButtonPrimaryText: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(7, 26, 61, 0.55)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  warningBox: {
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    padding: 12,
  },
  warningText: {
    color: colors.danger,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  inputLabel: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.65,
  },
});

export default SettingsScreen;
