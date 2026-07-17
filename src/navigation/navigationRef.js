import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

const getPathFromLink = (link = '') => {
  const raw = String(link || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    return `/${parsed.pathname.replace(/^\/+/, '')}`;
  } catch {
    return `/${raw.replace(/^(rentalhub:\/\/|https?:\/\/(www\.)?rentalhub\.com\.ng)?\/?/i, '')}`;
  }
};

const navigateIfAvailable = (routeName, params) => {
  const routeNames = navigationRef.getRootState()?.routeNames || [];
  if (!routeNames.includes(routeName)) return false;
  navigationRef.navigate(routeName, params);
  return true;
};

export const openRentalHubLinkInApp = (link) => {
  if (!navigationRef.isReady()) return false;

  const path = getPathFromLink(link)
    .replace(/\/+$/, '')
    .toLowerCase();

  if (!path || path === '/') return false;

  if (path === '/messages') {
    return openNotificationDestination({ screen: 'Messages' });
  }

  if (path === '/payment-history') {
    return navigateIfAvailable('PaymentHistory');
  }

  if (path === '/notifications') {
    return navigateIfAvailable('Notifications');
  }

  if (path === '/support') {
    return navigateIfAvailable('Support') || navigateIfAvailable('ContactWidget');
  }

  const propertyMatch = path.match(/^\/properties\/([^/]+)$/);
  if (propertyMatch) {
    return navigateIfAvailable('PropertyDetail', { id: propertyMatch[1] });
  }

  const adminPropertyMatch = path.match(/^\/admin\/properties\/([^/]+)$/);
  if (adminPropertyMatch) {
    return navigateIfAvailable('AdminPropertyDetail', { id: adminPropertyMatch[1] });
  }

  const adminUserMatch = path.match(/^\/admin\/users\/([^/]+)$/);
  if (adminUserMatch) {
    return navigateIfAvailable('AdminUserDetail', { id: adminUserMatch[1] });
  }

  const transportBookingMatch = path.match(/^\/transportation\/bookings\/([^/]+)$/);
  if (transportBookingMatch) {
    return navigateIfAvailable('TransportationBookingDetail', {
      bookingId: transportBookingMatch[1],
    });
  }

  const fumigationBookingMatch = path.match(/^\/fumigation-cleaning\/bookings\/([^/]+)$/);
  if (fumigationBookingMatch) {
    return navigateIfAvailable('FumigationCleaningBookingDetail', {
      bookingId: fumigationBookingMatch[1],
    });
  }

  return false;
};

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
