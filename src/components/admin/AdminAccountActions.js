import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useContext } from 'react';
import {Alert, StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../../context/AuthContext';
import { colors, radius, shadows, typography, typeScale } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

import AppText from '../../components/common/AppText';
const AdminActionPill = ({ label, icon, color = colors.blue, onPress }) => {
  useInterfaceLanguage();
  const { scaleFont, hitSlop } = useAccessibilityPreferences();

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={hitSlop}
      style={styles.pill}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}16` }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <AppText style={[styles.label, { color, fontSize: scaleFont(12) }]}>{label}</AppText>
    </TouchableOpacity>
  );
};

const AdminAccountActions = ({ navigation }) => {
  useInterfaceLanguage();
  const {
    exitImpersonation,
    isImpersonating,
    logout,
  } = useContext(AuthContext);

  const confirmSessionAction = () => {
    if (isImpersonating) {
      Alert.alert(
        ui("Exit impersonation"),
        ui("Return to your original super-admin dashboard?"),
        [
          { text: ui("Cancel"), style: 'cancel' },
          {
            text: ui("Exit admin"),
            onPress: () => {
              exitImpersonation().catch((error) => {
                Alert.alert(
                  ui("Could not exit impersonation"),
                  error?.message || ui("Please sign out and sign in again.")
                );
              });
            },
          },
        ]
      );
      return;
    }

    Alert.alert(ui("Logout"), ui("Do you want to sign out of this admin session?"), [
      { text: ui("Cancel"), style: 'cancel' },
      { text: ui("Logout"), style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <AdminActionPill
        label={ui("Profile")}
        icon="person-circle-outline"
        onPress={() => navigation.navigate('Profile')}
      />
      <AdminActionPill
        label={ui("Settings")}
        icon="settings-outline"
        color={colors.navy}
        onPress={() => navigation.navigate('Settings')}
      />
      <AdminActionPill
        label={isImpersonating ? ui("Exit admin") : ui("Logout")}
        icon={isImpersonating ? 'return-up-back-outline' : 'log-out-outline'}
        color={isImpersonating ? colors.warning : colors.danger}
        onPress={confirmSessionAction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
    padding: 10,
    ...shadows.soft,
  },
  pill: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 70,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 11,
    height: 34,
    justifyContent: 'center',
    marginBottom: 6,
    width: 34,
  },
  label: {
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
});

export default AdminAccountActions;
