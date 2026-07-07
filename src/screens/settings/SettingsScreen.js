import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { useTour } from '../../context/TourContext';
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

const labels = {
  pushMessages: 'Messages',
  pushPayments: 'Payments',
  pushApplications: 'Applications',
  pushBookings: 'Bookings',
  adminAlerts: 'Admin work alerts',
  weakNetworkWarnings: 'Weak-network warnings',
};

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { replayTour } = useTour();
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);

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

  const updateSetting = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await saveAppSettings(next);
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
      />

      <DashboardNotice
        title="Synced preferences"
        message="Notification switches are saved on this device and synced to your account when the server is reachable."
      />

      <DashboardSection title="Notification preferences">
        {notificationKeys.map((key) => (
          <View key={key} style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>{labels[key]}</Text>
              <Text style={styles.switchSubtitle}>Allow native alerts for {labels[key].toLowerCase()}.</Text>
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
          title="Privacy summary"
          subtitle="Review the mobile privacy summary."
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
            <Text style={styles.switchTitle}>{labels.weakNetworkWarnings}</Text>
            <Text style={styles.switchSubtitle}>Show a banner when API requests detect poor connectivity.</Text>
          </View>
          <Switch
            value={settings.weakNetworkWarnings}
            onValueChange={(value) => updateSetting('weakNetworkWarnings', value)}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={settings.weakNetworkWarnings ? colors.blue : colors.white}
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

      <DashboardSection title="Account">
        <ActionRow
          title="Account deletion"
          subtitle="Open profile and contact support if deletion is blocked by active records."
          icon="trash-outline"
          badge="Secure"
          onPress={() => navigation.navigate('Profile')}
        />
        <ActionRow
          title="Logout"
          subtitle="Sign out from this device."
          icon="log-out-outline"
          onPress={confirmLogout}
        />
      </DashboardSection>
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});

export default SettingsScreen;
