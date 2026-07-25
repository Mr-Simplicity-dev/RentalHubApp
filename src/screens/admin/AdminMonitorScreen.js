import React, { useCallback, useMemo, useState } from 'react';
import {StyleSheet TextInput, View} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { superAdminService } from '../../services/superAdminService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

import AppText from '../../components/common/AppText';
const PAGE_SIZE = 50;

const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};

const AdminMonitorScreen = () => {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: PAGE_SIZE, offset: 0 });
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadActivities = useCallback(async ({ append = false } = {}) => {
    const nextOffset = append ? activities.length : 0;
    append ? setLoadingMore(true) : setRefreshing(true);
    try {
      const response = await superAdminService.getAdminMonitor({
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      const rows = pickList(response, ['data']);
      const nextPagination =
        pickObject(response, ['pagination']) ||
        { total: rows.length, limit: PAGE_SIZE, offset: nextOffset };
      setActivities((current) => (append ? [...current, ...rows] : rows));
      setPagination(nextPagination);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Activity unavailable',
        text2: getErrorMessage(error, 'Could not load admin activity'),
      });
    } finally {
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activities.length]);

  React.useEffect(() => {
    loadActivities();
  }, []); // load the first page once

  const filteredActivities = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return activities;
    return activities.filter((item) =>
      [
        item.actor_name,
        item.actor_email,
        item.actor_role,
        item.action,
        item.target_type,
        item.target_id,
      ].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [activities, query]);

  const canLoadMore = activities.length < Number(pagination.total || 0);
  const header = (
    <>
      <PremiumHero
        eyebrow="SUPER ADMIN"
        title="Admin activity monitor"
        subtitle="Review auditable actions performed by administrative accounts across RentalHub."
        icon="pulse-outline"
        right={<StatusPill label={`${pagination.total || 0} actions`} color={colors.blue} />}
      />
      <TextInput
        accessibilityLabel="Search admin activity"
        autoCapitalize="none"
        placeholder="Search name, role, action or target"
        placeholderTextColor={colors.muted}
        style={styles.search}
        value={query}
        onChangeText={setQuery}
      />
      <AppText style={styles.summary}>
        Showing {filteredActivities.length} of {activities.length} loaded actions
      </AppText>
    </>
  );

  return (
    <PremiumListScreen
      data={filteredActivities}
      keyExtractor={(item, index) => String(item.id ?? `${item.created_at}-${index}`)}
      refreshing={refreshing}
      onRefresh={() => loadActivities()}
      header={header}
      emptyTitle="No admin activity found"
      emptyMessage={query ? 'Try a broader search.' : 'Audited admin actions will appear here.'}
      emptyIcon="shield-checkmark-outline"
      ListFooterComponent={
        canLoadMore ? (
          <PremiumButton
            title="Load more activity"
            variant="secondary"
            loading={loadingMore}
            onPress={() => loadActivities({ append: true })}
          />
        ) : null
      }
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardHeader}>
            <View style={styles.cardCopy}>
              <AppText style={styles.actor}>{item.actor_name || 'Unknown administrator'}</AppText>
              <AppText style={styles.email}>{item.actor_email || 'Email unavailable'}</AppText>
            </View>
            <StatusPill label={item.actor_role || 'admin'} color={colors.blue} />
          </View>
          <InfoRow icon="flash-outline" label="Action" value={item.action || 'Activity recorded'} />
          <InfoRow
            icon="locate-outline"
            label="Target"
            value={
              [item.target_type, item.target_id ? `#${item.target_id}` : null]
                .filter(Boolean)
                .join(' ') || 'Platform'
            }
          />
          <InfoRow icon="time-outline" label="Recorded" value={formatDateTime(item.created_at)} />
        </PremiumCard>
      )}
    />
  );
};

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summary: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 14,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardCopy: {
    flex: 1,
  },
  actor: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  email: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
});

export default AdminMonitorScreen;
