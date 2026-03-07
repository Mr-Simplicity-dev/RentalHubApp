import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { notificationService } from '../../services/notificationService';
import { getErrorMessage, pickList } from '../../utils/http';

const NotificationsScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications();
      setItems(pickList(response, ['data', 'notifications']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load notifications'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markOne = async (id) => {
    try {
      await notificationService.markAsRead(id);
      await loadNotifications();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not mark notification as read'),
      });
    }
  };

  const markAll = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
      Toast.show({ type: 'success', text1: 'Notifications marked as read' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not mark all notifications'),
      });
    }
  };

  const removeOne = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      await loadNotifications();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not delete notification'),
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Button title="Mark All" size="sm" onPress={markAll} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.is_read && styles.cardUnread]}
            onPress={() => markOne(item.id)}
          >
            <Text style={styles.cardTitle}>{item.title || item.notification_type || 'Notification'}</Text>
            <Text style={styles.cardMessage}>{item.message || 'No message available'}</Text>
            <Text style={styles.cardDate}>
              {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
            </Text>
            <TouchableOpacity onPress={() => removeOne(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notifications available.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  cardUnread: {
    borderColor: '#93c5fd',
    backgroundColor: '#f8fbff',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardMessage: { marginTop: 6, color: '#475569' },
  cardDate: { marginTop: 6, color: '#64748b', fontSize: 12 },
  deleteBtn: { marginTop: 8 },
  deleteText: { color: '#dc2626', fontWeight: '700' },
  empty: { marginTop: 40, textAlign: 'center', color: '#64748b' },
});

export default NotificationsScreen;
