import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import {
  InfoRow,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
  formatNaira,
} from '../../components/common/PremiumLayout';
import { transportationService } from '../../services/transportationService';
import { getErrorMessage } from '../../utils/http';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const STATUS_COLORS = {
  pending: colors.warning,
  confirmed: colors.blue,
  scheduled: colors.purple || '#8B5CF6',
  in_progress: colors.info || '#06B6D4',
  completed: colors.success,
  cancelled: colors.danger,
  rescheduled: colors.warning,
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

const StatCard = ({ value, label, tone }) => (
  <PremiumCard style={styles.statCard}>
    <AppText style={[styles.statNumber, tone ? { color: tone } : null]}>{value || 0}</AppText>
    <AppText style={styles.statLabel}>{label}</AppText>
  </PremiumCard>
);

const TransportationBookingsScreen = ({ navigation }) => {
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
        transportationService.getMyBookings({ page: pageNum, limit: 20 }),
        transportationService.getTenantStats(),
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

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadBookings(page + 1);
    }
  };

  const header = (
    <>
      <PremiumHero
        eyebrow="Transportation"
        title="My moving bookings"
        subtitle="Track upcoming transport jobs, route details, schedules and payment totals in a native booking timeline."
        icon="car-outline"
      />
      {stats ? (
        <View style={styles.statsContainer}>
          <StatCard value={stats.total_bookings} label="Total" />
          <StatCard value={stats.upcoming_bookings} label="Upcoming" />
          <StatCard value={stats.completed_bookings} label="Completed" tone={colors.success} />
          <StatCard value={stats.pending_bookings} label="Pending" tone={colors.warning} />
        </View>
      ) : null}
    </>
  );

  return (
    <PremiumListScreen
      data={bookings}
      renderItem={({ item }) => {
        const status = item.status || 'pending';
        return (
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => navigation.navigate('TransportationBookingDetail', { bookingId: item.id })}
          >
            <PremiumCard>
              <View style={styles.bookingHeader}>
                <View style={styles.titleBlock}>
                  <AppText style={styles.serviceName}>{item.service_name || 'Transportation'}</AppText>
                  <AppText style={styles.routeText} numberOfLines={2}>
                    {item.pickup_address || 'Pickup'} to {item.destination_address || 'Destination'}
                  </AppText>
                </View>
                <StatusPill label={STATUS_LABELS[status] || status} color={STATUS_COLORS[status] || colors.muted} />
              </View>

              <InfoRow
                icon="calendar-outline"
                label="Schedule"
                value={`${item.booking_date || 'Date pending'} at ${item.booking_time || 'time pending'}`}
              />
              <InfoRow icon="cash-outline" label="Total" value={formatNaira(item.total_price || 0)} />
            </PremiumCard>
          </TouchableOpacity>
        );
      }}
      keyExtractor={(item) => String(item.id)}
      header={header}
      emptyTitle={loading ? 'Loading bookings' : 'No transportation bookings'}
      emptyMessage={loading ? 'Please wait while we prepare your bookings.' : "You haven't made any transportation bookings yet."}
      emptyIcon="car-outline"
      refreshing={refreshing}
      onRefresh={() => loadBookings(1, true)}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loading && bookings.length > 0 ? (
          <ActivityIndicator style={styles.loader} color={colors.blue} />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    minWidth: '22%',
    paddingHorizontal: 8,
    paddingVertical: 13,
  },
  statNumber: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  bookingHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
  },
  serviceName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  routeText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  loader: {
    paddingVertical: 20,
  },
});

export default TransportationBookingsScreen;
