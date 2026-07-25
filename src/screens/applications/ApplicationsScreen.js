import React, { useContext, useEffect, useMemo, useState } from 'react';
import {ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { applicationService } from '../../services/applicationService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
const statusVisual = (status = 'pending') => {
  const value = String(status).toLowerCase();
  if (['approved', 'accepted'].includes(value)) {
    return { color: colors.success, bg: '#EAF9F2', icon: 'checkmark-circle' };
  }
  if (value === 'rejected') {
    return { color: colors.danger, bg: '#FFF0EF', icon: 'close-circle' };
  }
  if (value === 'withdrawn') {
    return { color: colors.muted, bg: '#EEF1F5', icon: 'remove-circle' };
  }
  return { color: '#B46B00', bg: '#FFF6DD', icon: 'time' };
};

const ApplicationsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('all');

  const isTenant = user?.user_type === 'tenant';

  const loadApplications = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = isTenant
        ? await applicationService.getMyApplications()
        : await applicationService.getReceivedApplications();
      setItems(pickList(response, ['data', 'applications']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load applications',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [user?.user_type]);

  const counts = useMemo(
    () =>
      items.reduce(
        (result, item) => {
          const status = String(item.status || 'pending').toLowerCase();
          result[status] = (result[status] || 0) + 1;
          return result;
        },
        { pending: 0, approved: 0, rejected: 0, withdrawn: 0 }
      ),
    [items]
  );

  const visibleItems = useMemo(
    () =>
      filter === 'all'
        ? items
        : items.filter((item) => String(item.status || 'pending').toLowerCase() === filter),
    [filter, items]
  );

  const runAction = async (id, action) => {
    setBusyId(id);
    try {
      if (action === 'withdraw') {
        await applicationService.withdrawApplication(id);
      } else if (action === 'approve') {
        await applicationService.approveApplication(id);
      } else {
        await applicationService.rejectApplication(id, 'Rejected from RentalHub mobile app');
      }
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status:
                  action === 'withdraw'
                    ? 'withdrawn'
                    : action === 'approve'
                      ? 'approved'
                      : 'rejected',
              }
            : item
        )
      );
      Toast.show({
        type: 'success',
        text1:
          action === 'withdraw'
            ? 'Application withdrawn'
            : action === 'approve'
              ? 'Application approved'
              : 'Application rejected',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not update application',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const confirmAction = (item, action) => {
    const copy =
      action === 'withdraw'
        ? {
            title: 'Withdraw application?',
            message: 'You will need to apply again if you change your mind.',
            confirm: 'Withdraw',
          }
        : action === 'approve'
          ? {
              title: 'Approve this application?',
              message: `Approve ${item.tenant_name || 'this tenant'} for ${item.property_title || 'the property'}?`,
              confirm: 'Approve',
            }
          : {
              title: 'Reject this application?',
              message: 'This decision will be shown to the applicant.',
              confirm: 'Reject',
            };

    Alert.alert(copy.title, copy.message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy.confirm,
        style: action === 'approve' ? 'default' : 'destructive',
        onPress: () => runAction(item.id, action),
      },
    ]);
  };

  const filterOptions = ['all', 'pending', 'approved', 'rejected'];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>RENTAL WORKFLOW</AppText>
          <AppText style={styles.title}>{isTenant ? 'My applications' : 'Applications'}</AppText>
        </View>
        <View style={styles.headerIcon}>
          <Icon name="documents-outline" size={22} color={colors.blue} />
        </View>
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !visibleItems.length && styles.emptyList]}
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <AppText style={styles.summaryValue}>{items.length}</AppText>
                <AppText style={styles.summaryLabel}>{isTenant ? 'Submitted' : 'Received'}</AppText>
              </View>
              <View style={styles.summaryCard}>
                <AppText style={[styles.summaryValue, styles.pendingValue]}>{counts.pending || 0}</AppText>
                <AppText style={styles.summaryLabel}>Pending</AppText>
              </View>
              <View style={styles.summaryCard}>
                <AppText style={[styles.summaryValue, styles.approvedValue]}>{counts.approved || 0}</AppText>
                <AppText style={styles.summaryLabel}>Approved</AppText>
              </View>
            </View>
            <View style={styles.filterRow}>
              {filterOptions.map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.filterChip, filter === value && styles.filterChipActive]}>
                  <AppText style={[styles.filterText, filter === value && styles.filterTextActive]}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
              <AppText style={styles.loadingText}>Loading applications…</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="document-text-outline" size={31} color={colors.blue} />
              </View>
              <AppText style={styles.emptyTitle}>
                {filter === 'all' ? 'No applications yet' : `No ${filter} applications`}
              </AppText>
              <AppText style={styles.emptyText}>
                {isTenant
                  ? 'When you apply for a verified home, its progress will appear here.'
                  : 'Applications from prospective tenants will appear here.'}
              </AppText>
              {isTenant && filter === 'all' ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('PropertyList')}
                  style={styles.exploreButton}>
                  <AppText style={styles.exploreText}>Explore verified homes</AppText>
                  <Icon name="arrow-forward" size={17} color={colors.white} />
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadApplications({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={({ item }) => {
          const status = String(item.status || 'pending').toLowerCase();
          const visual = statusVisual(status);
          const pending = status === 'pending';
          return (
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ApplicationDetail', { id: item.id })}>
                <View style={styles.cardTop}>
                  <View style={[styles.statusIcon, { backgroundColor: visual.bg }]}>
                    <Icon name={visual.icon} size={20} color={visual.color} />
                  </View>
                  <View style={styles.cardHeading}>
                    <AppText style={styles.cardTitle} numberOfLines={2}>
                      {item.property_title || 'Rental property'}
                    </AppText>
                    <AppText style={styles.cardMeta}>
                      {isTenant
                        ? `Landlord: ${item.landlord_name || 'RentalHub landlord'}`
                        : `Applicant: ${item.tenant_name || 'RentalHub tenant'}`}
                    </AppText>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: visual.bg }]}>
                    <AppText style={[styles.statusText, { color: visual.color }]}>{status}</AppText>
                  </View>
                </View>
              </TouchableOpacity>

              {item.message ? (
                <View style={styles.messageBox}>
                  <Icon name="chatbubble-ellipses-outline" size={16} color={colors.muted} />
                  <AppText style={styles.cardText}>{item.message}</AppText>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <Icon name="calendar-outline" size={14} color={colors.muted} />
                <AppText style={styles.detailText}>
                  {item.created_at
                    ? `Submitted ${new Date(item.created_at).toLocaleDateString()}`
                    : 'Submission date unavailable'}
                </AppText>
              </View>

              {pending ? (
                <View style={styles.actions}>
                  {isTenant ? (
                    <TouchableOpacity
                      disabled={busyId === item.id}
                      onPress={() => confirmAction(item, 'withdraw')}
                      style={styles.secondaryAction}>
                      {busyId === item.id ? (
                        <ActivityIndicator color={colors.danger} size="small" />
                      ) : (
                        <AppText style={styles.withdrawText}>Withdraw</AppText>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        disabled={busyId === item.id}
                        onPress={() => confirmAction(item, 'reject')}
                        style={styles.secondaryAction}>
                        <AppText style={styles.rejectText}>Reject</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={busyId === item.id}
                        onPress={() => confirmAction(item, 'approve')}
                        style={styles.primaryAction}>
                        {busyId === item.id ? (
                          <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                          <>
                            <AppText style={styles.primaryActionText}>Approve</AppText>
                            <Icon name="checkmark" size={17} color={colors.white} />
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : null}
            </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    marginTop: 3,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  list: { padding: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  summaryRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  summaryValue: { color: colors.ink, fontFamily: typography.bold, fontSize: 20 },
  pendingValue: { color: '#B46B00' },
  approvedValue: { color: colors.success },
  summaryLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 2,
  },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  filterChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { color: colors.text, fontFamily: typography.medium, fontSize: 13 },
  filterTextActive: { color: colors.white, fontFamily: typography.semibold },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15,
  },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row' },
  statusIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardHeading: { flex: 1, marginLeft: 11, marginRight: 7 },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: {
    fontFamily: typography.bold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  messageBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginTop: 13,
    padding: 11,
  },
  cardText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 17,
    marginLeft: 7,
  },
  detailRow: { alignItems: 'center', flexDirection: 'row', marginTop: 12 },
  detailText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginLeft: 5,
  },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  secondaryAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryActionText: { color: colors.white, fontFamily: typography.semibold, fontSize: 13 },
  rejectText: { color: colors.danger, fontFamily: typography.semibold, fontSize: 13 },
  withdrawText: { color: colors.danger, fontFamily: typography.semibold, fontSize: 13 },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 390,
    paddingHorizontal: 26,
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
  exploreButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    marginTop: 19,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  exploreText: { color: colors.white, fontFamily: typography.semibold, fontSize: 13 },
});

export default ApplicationsScreen;
