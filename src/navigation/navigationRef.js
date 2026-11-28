import { createNavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';

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

const navigateMainTab = (screen, params) => {
  const routeNames = navigationRef.getRootState()?.routeNames || [];
  if (routeNames.includes('MainTabs')) {
    navigationRef.navigate('MainTabs', { screen, ...(params ? { params } : {}) });
    return true;
  }
  return navigateIfAvailable(screen, params);
};

export const openRentalHubLinkInApp = (link) => {
  if (!navigationRef.isReady()) return false;

  const query = String(link || '').split(/[?#]/)[1]?.split('#')[0] || '';
  const search = new URLSearchParams(query);
  const path = getPathFromLink(link)
    .split(/[?#]/)[0]
    .replace(/\/+$/, '')
    .toLowerCase();

  if (!path || path === '/') return false;

  if (['/dashboard', '/tenant/dashboard', '/landlord/dashboard'].includes(path)) {
    return navigateMainTab('DashboardTab') || navigateIfAvailable('DashboardTab') || navigateIfAvailable('Dashboard');
  }

  if (path === '/applications') {
    return navigateMainTab('Applications') || navigateIfAvailable('Applications');
  }

  if (path === '/messages') {
    return openNotificationDestination({ screen: 'Messages' });
  }

  if (path === '/payment-history') {
    return navigateIfAvailable('PaymentHistory');
  }

  if (path === '/notifications') {
    return navigateIfAvailable('Notifications');
  }
  if (path === '/verification-status') return navigateIfAvailable('VerificationStatus');
  if (path === '/my-properties') return navigateIfAvailable('MyProperties');
  if (path === '/my-disputes') return navigateIfAvailable('MyDisputes');
  if (path === '/refund-requests') return navigateIfAvailable('RefundRequests');
  if (path === '/careers') return navigateIfAvailable('Careers');
  if (path === '/admin/code-of-conduct') return navigateIfAvailable('AdminConduct');
  if (path === '/admin/verifications') return navigateIfAvailable('AdminVerifications');
  if (path === '/admin/recruitment') {
    return navigateIfAvailable('RecruitmentAdmin', search.get('tab') ? { tab: search.get('tab') } : undefined);
  }
  if (path === '/admin/super-support-dashboard') {
    return navigateIfAvailable(
      'SuperAdminSupportGovernance',
      search.get('tab') ? { tab: search.get('tab') } : undefined
    ) || navigateIfAvailable('AdminSupportDashboard');
  }
  if (path === '/admin/state-support-dashboard' || path === '/admin/lga-support-dashboard') {
    return navigateIfAvailable(
      'AdminSupportDashboard',
      search.get('tab') ? { tab: search.get('tab') } : undefined
    ) || navigateIfAvailable('SupportTickets');
  }
  if (path === '/my-staff-identity') return navigateIfAvailable('MyStaffIdentity');
  if (path === '/staff-identity-management' || (path === '/super-admin' && search.get('tab') === 'staff_identity')) {
    return navigateIfAvailable('StaffIdentityManagement');
  }
  if (path === '/super-admin' && search.get('tab') === 'verifications') {
    return navigateIfAvailable('AdminVerifications') || navigateIfAvailable('SuperAdminDashboard');
  }
  if (path === '/super-admin') return navigateIfAvailable('SuperAdminDashboard');

  if (path === '/admin/whatsapp-support') return navigateIfAvailable('WhatsAppSupport');

  if (path === '/property-protection') {const property=String(link).match(/[?&]property=(\d+)/)?.[1],view=String(link).match(/[?&]view=(owner|assigned|operations)/)?.[1];return navigateIfAvailable('PropertyProtection',{propertyId:property,view});}

  if (path === '/support') {
    return navigateIfAvailable('Support') || navigateIfAvailable('ContactWidget');
  }

  const disputeMatch = path.match(/^\/dispute\/(\d+)$/);
  if (disputeMatch) return navigateIfAvailable('DisputeDetails', {disputeId:disputeMatch[1]});
  const supportMatch = path.match(/^\/support\/tickets\/(\d+)$/);
  if (supportMatch) return navigateIfAvailable('SupportTicketDetail', {ticketId:supportMatch[1]}) || navigateIfAvailable('ContactWidget', {initialView:'tickets',ticketId:supportMatch[1]});
  const propertyMatch = path.match(/^\/properties\/([^/]+)$/);
  if (propertyMatch) {
    return navigateIfAvailable('PropertyDetail', { id: propertyMatch[1] });
  }

  const adminPropertyMatch = path.match(/^\/admin\/properties\/([^/]+)$/);
  if (adminPropertyMatch) {
    return navigateIfAvailable('AdminPropertyDetail', { id: adminPropertyMatch[1] });
  }

  const adminAppealMatch = path.match(/^\/admin\/appeals\/(\d+)$/);
  if (adminAppealMatch) {
    return navigateIfAvailable('AdminAppeals', { appealId: adminAppealMatch[1] });
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

export const openNotificationLink = async (link) => {
  if (openRentalHubLinkInApp(link)) return true;

  const raw = String(link || '').trim();
  if (!raw) return false;

  let url;
  try {
    url = new URL(raw, 'https://rentalhub.com.ng');
  } catch {
    return false;
  }

  if (
    url.protocol !== 'https:' ||
    !['rentalhub.com.ng', 'www.rentalhub.com.ng'].includes(url.hostname) ||
    (raw.startsWith('//'))
  ) {
    return false;
  }

  await Linking.openURL(url.href);
  return true;
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

  if (data.screen === 'Notifications') {
    return navigateIfAvailable('Notifications');
  }

  return false;
};
