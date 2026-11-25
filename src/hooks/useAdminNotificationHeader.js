import React, { useLayoutEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import NotificationBell from '../components/common/NotificationBell';
import HeadphoneSupportButton from '../components/calls/HeadphoneSupportButton';

export default function useAdminNotificationHeader(navigation) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerRight: () => (
        <View style={styles.row}>
          <HeadphoneSupportButton />
          <NotificationBell />
        </View>
      ),
    });
  }, [navigation]);
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 6 : 8,
    minHeight: 38,
    paddingRight: Platform.OS === 'ios' ? 2 : 0,
  },
});
