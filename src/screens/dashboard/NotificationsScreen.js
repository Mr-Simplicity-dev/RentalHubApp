import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { notificationService } from '../../services/notificationService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
const notificationVisual = (type = '') => {
  const value = String(type).toLowerCase();
  if (value.includes('payment')) return { icon: 'card-outline', color: '#8B5CF6', bg: '#F3EEFF' };
  if (value.includes('message')) return { icon: 'chatbubble-outline', color: colors.blue, bg: colors.surfaceBlue };
  if (value.includes('application')) return { icon: 'document-text-outline', color: '#D97706', bg: '#FFF7E6' };
  if (value.includes('verification')) return { icon: 'shield-checkmark-outline', color: colors.success, bg: '#EAF9F2' };
  return { icon: 'notifications-outline', color: colors.blue, bg: colors.surfaceBlue };
};

const NotificationsScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items]
  );

  const loadNotifications = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await notificationService.getNotifications();
      setItems(pickList(response, ['data', 'notifications']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load notifications',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markOne = async (item) => {
    if (item.is_read || busyId) return;
    setBusyId(item.id);
    setItems((current) =>
      current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry)
    );
    try {
      await notificationService.markAsRead(item.id);
    } catch (error) {
      setItems((current) =>
        current.map((entry) => entry.id === item.id ? { ...entry, is_read: false } : entry)
      );
      Toast.show({
        type: 'error',
        text1: 'Could not mark notification',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    if (!unreadCount) return;
    const previous = items;
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    try {
      await notificationService.markAllAsRead();
      Toast.show({ type: 'success', text1: 'You’re all caught up' });
    } catch (error) {
      setItems(previous);
      Toast.show({
        type: 'error',
        text1: 'Could not update notifications',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    }
  };

  const removeOne = async (id) => {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      await notificationService.deleteNotification(id);
    } catch (error) {
      setItems(previous);
      Toast.show({
        type: 'error',
        text1: 'Could not delete notification',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>UPDATES</AppText>
          <AppText style={styles.title}>Notifications</AppText>
        </View>
        <TouchableOpacity
          disabled={!unreadCount}
          onPress={markAll}
          style={styles.markAllButton}>
          <Icon name="checkmark-done" size={20} color={unreadCount ? colors.blue : colors.muted} />
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !items.length && styles.emptyList]}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          !loading && items.length ? (
            <AppText style={styles.summary}>
              {unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You’re all caught up'}
            </AppText>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
              <AppText style={styles.loadingText}>Loading updates…</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="notifications-off-outline" size={31} color={colors.blue} />
              </View>
              <AppText style={styles.emptyTitle}>Quiet for now</AppText>
              <AppText style={styles.emptyText}>
                Important property, payment and account updates will appear here.
              </AppText>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadNotifications({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={({ item }) => {
          const visual = notificationVisual(item.notification_type || item.type);
          return (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => markOne(item)}
              style={[styles.card, !item.is_read && styles.cardUnread]}>
              <View style={[styles.itemIcon, { backgroundColor: visual.bg }]}>
                <Icon name={visual.icon} size={20} color={visual.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardHeading}>
                  <AppText style={styles.cardTitle} numberOfLines={1}>
                    {item.title || item.notification_type || 'RentalHub update'}
                  </AppText>
                  {!item.is_read ? <View style={styles.unreadDot} /> : null}
                </View>
                <AppText style={styles.cardMessage}>{item.message || 'No message available'}</AppText>
                <AppText style={styles.cardDate}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </AppText>
              </View>
              <TouchableOpacity
                accessibilityLabel="Delete notification"
                onPress={(event) => {
                  event.stopPropagation();
                  removeOne(item.id);
                }}
                style={styles.deleteButton}>
                <Icon name="trash-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { alignItems: 'center', flex: 1 },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 2,
  },
  markAllButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  list: { padding: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  summary: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 12,
  },
  card: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 13,
  },
  cardUnread: {
    backgroundColor: '#F8FBFF',
    borderColor: '#BFD8FA',
  },
  itemIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardBody: { flex: 1, marginLeft: 11 },
  cardHeading: { alignItems: 'center', flexDirection: 'row' },
  cardTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  unreadDot: {
    backgroundColor: colors.blue,
    borderRadius: 4,
    height: 8,
    marginLeft: 7,
    width: 8,
  },
  cardMessage: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  cardDate: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 7,
  },
  deleteButton: { marginLeft: 5, padding: 4 },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 430,
    paddingHorizontal: 28,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 12,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 17,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
