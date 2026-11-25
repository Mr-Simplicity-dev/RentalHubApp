import React, { useCallback, useContext, useLayoutEffect } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import NotificationBell from '../components/common/NotificationBell';
import HeadphoneSupportButton from '../components/calls/HeadphoneSupportButton';
import { colors } from '../theme';

const HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

export default function useAdminNotificationHeader(navigation) {
  const { logout } = useContext(AuthContext) || {};

  const confirmLogout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          if (typeof logout === 'function') logout();
        },
      },
    ]);
  }, [logout]);

  useLayoutEffect(() => {
    const isIos = Platform.OS === 'ios';
    navigation.setOptions({
      headerShown: true,
      headerRight: () => (
        <View style={styles.row}>
          <HeadphoneSupportButton compact={isIos} />
          <NotificationBell />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Profile"
            activeOpacity={0.8}
            hitSlop={HIT_SLOP}
            onPress={() => navigation.navigate('Profile')}
            style={styles.iconBtn}
          >
            <Icon name="person-circle-outline" size={isIos ? 20 : 22} color={colors.navy} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Log out"
            activeOpacity={0.8}
            hitSlop={HIT_SLOP}
            onPress={confirmLogout}
            style={styles.logoutBtn}
          >
            <Icon name="log-out-outline" size={isIos ? 18 : 19} color={colors.white} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, confirmLogout]);
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 5 : 6,
    minHeight: 38,
    paddingRight: Platform.OS === 'ios' ? 2 : 0,
  },
  iconBtn: {
    width: Platform.OS === 'ios' ? 32 : 34,
    height: Platform.OS === 'ios' ? 32 : 34,
    borderRadius: 17,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: Platform.OS === 'ios' ? 32 : 34,
    height: Platform.OS === 'ios' ? 32 : 34,
    borderRadius: 17,
    backgroundColor: colors.danger || '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
