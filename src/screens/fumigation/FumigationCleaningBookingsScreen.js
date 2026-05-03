import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { fumigationCleaningService } from '../../services/fumigationCleaningService';
import { getErrorMessage } from '../../utils/http';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  scheduled: '#8b5cf6',
  in_progress: '#06b6d4',
  completed: '#16a34a',
  cancelled: '#ef4444',
  rescheduled: '#f97316',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

const FumigationCleaningBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState(null);

  const loadBookings = async (pageNum = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);

    try {
      const [bookingsRes, statsRes] = await Promise.all([
        fumigationCleaningService.getMyBookings({ page: pageNum, limit: 20 }),
        fumigationCleaningService.getTenantStats(),
      ]);

      const newBookings = bookingsRes?.data || [];
      if (pageNum === 1) {
        setBookings(newBookings);
      } else {
        setBookings((prev) => [...prev, ...newBookings]);
      }

      setStats(statsRes?.data);
      setHasMore(newBookings.length === 20);
      setPage(pageNum);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: getErrorMessage(error, 'Could not load bookings'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const renderBooking = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate('FumigationCleaningBookingDetail', { bookingId: item.id })}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.serviceName}>{item.service_name || 'Fumigation/Cleaning'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#6b7280' }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[item.status] || item.status}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Icon name="calendar-outline" size={16} color="#64748b" />
        <Text style={styles.detailText}>{item.booking_date} at {item.booking_time}</Text>
      </View>

      <View style={styles.detailRow}>
        <Icon name="cash-outline" size={16} color="#64748b" />
        <Text style={styles.priceText}>₦{item.total_price?.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => {
    if (!stats) return null;
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total_bookings || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.upcoming_bookings || 0}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completed_bookings || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.pending_bookings || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon name="sparkles-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Bookings</Text>
              <Text style={styles.emptyText}>
                You haven't made any fumigation or cleaning bookings yet.
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadBookings(1, true)} colors={['#0284c7']} />
        }
        onEndReached={() => {
          if (hasMore && !loading) loadBookings(page + 1);
        }}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { paddingBottom: 20 },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#0284c7' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  bookingCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailText: { marginLeft: 6, color: '#475569', fontSize: 13 },
  priceText: { marginLeft: 6, color: '#0284c7', fontSize: 15, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 8 },
});

export default FumigationCleaningBookingsScreen;
