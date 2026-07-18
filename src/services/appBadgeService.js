import * as Notifications from 'expo-notifications';
import { messageService } from './messageService';
import { notificationService } from './notificationService';
import {
  getAppSettings,
  subscribeAppSettings,
} from './appSettingsService';
import { trackMobileEvent } from './mobileDiagnosticsService';

const toCount = (response) => {
  const candidates = [
    response?.data?.unread_count,
    response?.data?.count,
    response?.unread_count,
    response?.count,
  ];
  const value = candidates.find((candidate) => candidate !== undefined && candidate !== null);
  const count = Number(value || 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
};

export const fetchUnreadActivityCount = async () => {
  const [messageResult, notificationResult] = await Promise.allSettled([
    messageService.getUnreadCount(),
    notificationService.getUnreadCount(),
  ]);

  const unreadMessages =
    messageResult.status === 'fulfilled' ? toCount(messageResult.value) : 0;
  const unreadNotifications =
    notificationResult.status === 'fulfilled' ? toCount(notificationResult.value) : 0;

  return {
    total: unreadMessages + unreadNotifications,
    unreadMessages,
    unreadNotifications,
  };
};

export const setAppIconBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, Number(count) || 0));
  } catch {
    // Badge support varies by Android launcher; failure should never affect the app.
  }
};

export const clearAppIconBadge = async () => setAppIconBadgeCount(0);

export const syncAppIconBadge = async (reason = 'manual') => {
  const settings = await getAppSettings();
  if (settings.notificationBadges === false) {
    await clearAppIconBadge();
    return { total: 0, disabled: true };
  }

  const counts = await fetchUnreadActivityCount();
  await setAppIconBadgeCount(counts.total);
  trackMobileEvent('app_icon_badge_synced', {
    reason,
    total: counts.total,
    unread_messages: counts.unreadMessages,
    unread_notifications: counts.unreadNotifications,
  });
  return counts;
};

export const subscribeBadgeSettings = () =>
  subscribeAppSettings((settings) => {
    if (settings.notificationBadges === false) {
      clearAppIconBadge().catch(() => {});
    } else {
      syncAppIconBadge('settings_enabled').catch(() => {});
    }
  });
