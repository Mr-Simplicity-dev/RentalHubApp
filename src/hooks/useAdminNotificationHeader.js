import React, { useLayoutEffect } from 'react';
import NotificationBell from '../components/common/NotificationBell';

export default function useAdminNotificationHeader(navigation) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerRight: () => <NotificationBell />,
    });
  }, [navigation]);
}
