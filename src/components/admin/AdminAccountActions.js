import React, { useContext } from 'react';
import {Alert, StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../../context/AuthContext';
import { colors, radius, shadows, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

import AppText from '../../components/common/AppText';
const AdminActionPill = ({ label, icon, color = colors.blue, onPress }) => {
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
  const {
    exitImpersonation,
    isImpersonating,
    logout,
  } = useContext(AuthContext);

  const confirmSessionAction = () => {
    if (isImpersonating) {
      Alert.alert(
        'Exit impersonation',
        'Return to your original super-admin dashboard?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit admin',
            onPress: () => {
              exitImpersonation().catch((error) => {
                Alert.alert(
                  'Could not exit impersonation',
                  error?.message || 'Please sign out and sign in again.'
                );
              });
            },
          },
        ]
      );
      return;
    }

    Alert.alert('Logout', 'Do you want to sign out of this admin session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <AdminActionPill
        label="Profile"
        icon="person-circle-outline"
        onPress={() => navigation.navigate('Profile')}
      />
      <AdminActionPill
        label="Settings"
        icon="settings-outline"
        color={colors.navy}
        onPress={() => navigation.navigate('Settings')}
      />
      <AdminActionPill
        label={isImpersonating ? 'Exit admin' : 'Logout'}
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
    fontSize: 13,
  },
});

export default AdminAccountActions;
