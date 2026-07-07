import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const openNotificationDestination = (data = {}) => {
  if (!navigationRef.isReady()) return false;

  if (data.screen === 'Messages' || data.senderId) {
    const params = {
      senderId: data.senderId,
      senderName: data.senderName,
    };
    const routeNames = navigationRef.getRootState()?.routeNames || [];
    if (routeNames.includes('MainTabs')) {
      navigationRef.navigate('MainTabs', {
        screen: 'Messages',
        params,
      });
    } else {
      navigationRef.navigate('Messages', params);
    }
    return true;
  }

  return false;
};
