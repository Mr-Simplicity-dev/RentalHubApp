import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppText from './AppText';
import { colors, typography } from '../../theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import { notificationService } from '../../services/notificationService';
import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';

const NotificationBell = () => {
  useInterfaceLanguage();
  const navigation = useNavigation();
  const { hitSlop } = useAccessibilityPreferences();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadActivity();
      setUnreadCount(Number(response?.data?.total || 0));
    } catch (error) {
      // Keep the last known count when the refresh fails.
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const focusSub = navigation.addListener('focus', loadUnreadCount);
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      loadUnreadCount();
    });
    return () => {
      focusSub();
      receivedSub.remove();
    };
  }, [loadUnreadCount, navigation]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `${ui("Notifications")}, ${unreadCount}` : ui("Notifications")}
      activeOpacity={0.85}
      hitSlop={hitSlop}
      onPress={() => navigation.navigate('Notifications')}
      style={styles.button}
    >
      <Icon name="notifications-outline" size={20} color={colors.white} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</AppText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 10,
    lineHeight: 12,
  },
});

export default NotificationBell;
