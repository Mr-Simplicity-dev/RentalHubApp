import { translateUi as ui } from '../i18n/interfaceRuntime.cjs';
import { Platform } from 'react-native';
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
  // Prefer the server's single combined total so the count cannot drift
  // between the icon badge and the in-app badge.
  const activityResult = await Promise.allSettled([
    notificationService.getUnreadActivity(),
  ]);

  if (activityResult[0].status === 'fulfilled') {
    const data = activityResult[0].value?.data || {};
    const total = Number(data.total ?? data.unread_count ?? NaN);
    const unreadNotifications = Number(data.unread_notifications || 0);
    const unreadMessages = Number(data.unread_messages || 0);
    if (Number.isFinite(total)) {
      return {
        total: Math.max(0, total),
        unreadMessages: Math.max(0, unreadMessages),
        unreadNotifications: Math.max(0, unreadNotifications),
      };
    }
  }

  const [messageResult, notificationResult] = await Promise.allSettled([
    messageService.getUnreadCount(),
    notificationService.getUnreadCount(),
  ]);

  if (messageResult.status === 'rejected' || notificationResult.status === 'rejected') throw new Error('Unread counts unavailable');
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

const SUMMARY_ID = 'rentalhub-unread-summary';
const SUMMARY_CHANNEL_ID = 'unread-activity';
let sessionVersion = 0;
let refreshVersion = 0;
let badgeQueue = Promise.resolve();

const ensureSummaryChannel = async () => {
  await Notifications.setNotificationChannelAsync(SUMMARY_CHANNEL_ID, {
    name: ui('Unread activity'),
    importance: Notifications.AndroidImportance.LOW,
    showBadge: true,
    sound: null,
    enableVibrate: false,
  });
};

export const resetBadgeSession = () => { sessionVersion += 1; return clearAppIconBadge(); };
export const setAppIconBadgeCount = (count) => {
  const version = sessionVersion;
  const total = Number.isFinite(Number(count)) ? Math.max(0, Math.floor(Number(count))) : 0;
  badgeQueue = badgeQueue.catch(() => {}).then(async () => {
    if (version !== sessionVersion) return;
    const settings = await getAppSettings();
    if (version !== sessionVersion) return;
    const value = settings.notificationBadges === false ? 0 : total;

    // Android launchers only show an app badge while the app owns an active
    // notification (or exposes a launcher-specific badge provider). A silent,
    // low-priority summary keeps the unread number visible after the app is
    // minimised; setBadgeCountAsync handles launchers that support ShortcutBadger.
    if (Platform.OS === 'android') {
      if (value === 0) {
        await Promise.allSettled([
          Notifications.dismissNotificationAsync?.(SUMMARY_ID),
          Notifications.cancelScheduledNotificationAsync?.(SUMMARY_ID),
        ]);
      } else {
        let canPostSummary = false;
        try {
          const permission = await Notifications.getPermissionsAsync();
          canPostSummary = permission.granted || permission.status === 'granted';
        } catch {
          canPostSummary = false;
        }

        if (version !== sessionVersion) return;
        if (canPostSummary) {
          try {
            await ensureSummaryChannel();
            if (version !== sessionVersion) return;
            await Notifications.scheduleNotificationAsync({
              identifier: SUMMARY_ID,
              content: {
                title: ui('Amana RentalHub NG'),
                body: ui('{count} unread updates', { count: value }),
                badge: value,
                sound: false,
                autoDismiss: false,
                data: { screen: 'Notifications', badgeSummary: true },
              },
              trigger: { channelId: SUMMARY_CHANNEL_ID },
            });
          } catch (error) {
            trackMobileEvent('app_icon_badge_summary_failed', {
              message: String(error?.message || error),
            });
          }
        }
      }
    }

    if (version !== sessionVersion) return;
    try {
      const supported = await Notifications.setBadgeCountAsync(value);
      return { supported, total: value };
    } catch {
      // Badge support varies by Android launcher; failure should never affect the app.
      return { supported: false, total: value };
    }
  });
  return badgeQueue;
};
export const clearAppIconBadge = () => setAppIconBadgeCount(0);

export const syncAppIconBadge = async (reason = 'manual') => {
  const version = sessionVersion;
  const refresh = ++refreshVersion;
  const settings = await getAppSettings();
  if (version !== sessionVersion || refresh !== refreshVersion) return { stale: true };
  if (settings.notificationBadges === false) {
    await clearAppIconBadge();
    return { total: 0, disabled: true };
  }

  const counts = await fetchUnreadActivityCount();
  if (version !== sessionVersion || refresh !== refreshVersion) return { stale: true };
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
