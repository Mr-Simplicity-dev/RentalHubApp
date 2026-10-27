import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import TextInput from '../../components/common/AppTextInput';
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
import { colors, radius, typography, typeScale } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

import AppText from '../../components/common/AppText';
const PAGE_SIZE = 50;

const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};

const AdminMonitorScreen = () => {
  const interfaceLanguage = useInterfaceLanguage();
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
        text1: ui("Activity unavailable"),
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
  }, [activities, query, interfaceLanguage]);

  const canLoadMore = activities.length < Number(pagination.total || 0);
  const header = (
    <>
      <PremiumHero
        eyebrow={ui("SUPER ADMIN")}
        title={ui("Admin activity monitor")}
        subtitle={ui("Review auditable actions performed by administrative accounts across RentalHub.")}
        icon="pulse-outline"
        right={<StatusPill label={ui("{value0} actions", {value0: (pagination.total || 0)})} color={colors.blue} />}
      />
      <TextInput
        accessibilityLabel={ui("Search admin activity")}
        autoCapitalize="none"
        placeholder={ui("Search name, role, action or target")}
        placeholderTextColor={colors.muted}
        style={styles.search}
        value={query}
        onChangeText={setQuery}
      />
      <AppText style={styles.summary}>{ui("Showing")}{filteredActivities.length}{ui(" of ")}{activities.length}{ui("loaded actions")}</AppText>
    </>
  );

  return (
    <PremiumListScreen
      data={filteredActivities}
      keyExtractor={(item, index) => String(item.id ?? `${item.created_at}-${index}`)}
      refreshing={refreshing}
      onRefresh={() => loadActivities()}
      header={header}
      emptyTitle={ui("No admin activity found")}
      emptyMessage={query ? 'Try a broader search.' : 'Audited admin actions will appear here.'}
      emptyIcon="shield-checkmark-outline"
      ListFooterComponent={
        canLoadMore ? (
          <PremiumButton
            title={ui("Load more activity")}
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
            <StatusPill label={item.actor_role || ui("admin")} color={colors.blue} />
          </View>
          <InfoRow icon="flash-outline" label={ui("Action")} value={item.action || 'Activity recorded'} />
          <InfoRow
            icon="locate-outline"
            label={ui("Target")}
            value={
              [item.target_type, item.target_id ? `#${item.target_id}` : null]
                .filter(Boolean)
                .join(' ') || 'Platform'
            }
          />
          <InfoRow icon="time-outline" label={ui("Recorded")} value={formatDateTime(item.created_at)} />
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
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summary: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  email: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});

export default AdminMonitorScreen;
