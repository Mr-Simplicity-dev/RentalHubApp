import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import OperationNoteModal from '../../components/admin/OperationNoteModal';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { appealsService } from '../../services/appealsService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const STATUS_FILTERS = [
  ['pending', 'Pending'],
  ['under_review', 'Under review'],
  ['upheld', 'Upheld'],
  ['dismissed', 'Dismissed'],
  ['', 'All'],
];

const statusColor = (status) => {
  if (status === 'upheld') return colors.success;
  if (status === 'dismissed') return colors.danger;
  if (status === 'under_review') return colors.blue;
  return colors.warning;
};

const AdminAppealsScreen = () => {
  const [appeals, setAppeals] = useState([]);
  const [status, setStatus] = useState('pending');
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);

  const loadAppeals = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await appealsService.getAdminAppeals({
        status: status || undefined,
        page: 1,
        limit: 100,
      });
      setAppeals(pickList(response, ['data']));
      setTotal(Number(response?.total || 0));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Appeals unavailable',
        text2: getErrorMessage(error, 'Could not load admin appeals'),
      });
    } finally {
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    loadAppeals();
  }, [loadAppeals]);

  const markUnderReview = async (appeal) => {
    setActionId(`${appeal.id}-under_review`);
    try {
      await appealsService.markUnderReview(appeal.id);
      Toast.show({ type: 'success', text1: 'Appeal marked under review' });
      await loadAppeals();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: getErrorMessage(error, 'Could not update appeal'),
      });
    } finally {
      setActionId(null);
    }
  };

  const submitReview = async (note) => {
    if (!reviewAction) return;
    const key = `${reviewAction.appeal.id}-${reviewAction.status}`;
    setActionId(key);
    try {
      await appealsService.reviewAppeal(
        reviewAction.appeal.id,
        reviewAction.status,
        note
      );
      Toast.show({
        type: 'success',
        text1: reviewAction.status === 'upheld' ? 'Appeal upheld' : 'Appeal dismissed',
      });
      setReviewAction(null);
      await loadAppeals();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Review failed',
        text2: getErrorMessage(error, 'Could not review appeal'),
      });
    } finally {
      setActionId(null);
    }
  };

  const openFinalReview = async (appeal, nextStatus) => {
    const key = `${appeal.id}-details-${nextStatus}`;
    setActionId(key);
    try {
      const response = await appealsService.getAdminAppeal(appeal.id);
      const details = pickObject(response, ['data']) || appeal;
      setReviewAction({ appeal: details, status: nextStatus });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Appeal details unavailable',
        text2: getErrorMessage(error, 'Could not open this appeal'),
      });
    } finally {
      setActionId(null);
    }
  };

  const header = (
    <>
      <PremiumHero
        eyebrow="GOVERNANCE"
        title="Admin appeals"
        subtitle="Review appeals against property and identity-verification decisions within your jurisdiction."
        icon="scale-outline"
        right={<StatusPill label={`${total} total`} color={colors.blue} />}
      />
      <View style={styles.filters}>
        {STATUS_FILTERS.map(([value, label]) => (
          <TouchableOpacity
            key={value || 'all'}
            accessibilityRole="button"
            onPress={() => setStatus(value)}
            style={[styles.filter, status === value && styles.filterActive]}
          >
            <Text style={[styles.filterText, status === value && styles.filterTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <>
      <PremiumListScreen
        data={appeals}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={loadAppeals}
        header={header}
        emptyTitle={`No ${status ? status.replace(/_/g, ' ') : ''} appeals`}
        emptyMessage="Appeals matching this filter will appear here."
        emptyIcon="scale-outline"
        renderItem={({ item }) => {
          const canResolve = ['pending', 'under_review'].includes(item.status);
          return (
            <PremiumCard>
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <Text style={styles.title}>
                    Appeal #{item.id} - {String(item.appeal_type || 'appeal').replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.appellant}>
                    {item.appellant_name || item.appellant_email || 'Unknown appellant'}
                  </Text>
                </View>
                <StatusPill label={item.status} color={statusColor(item.status)} />
              </View>
              <InfoRow
                icon="chatbox-ellipses-outline"
                label="Appeal reason"
                value={item.appeal_reason || 'No reason provided'}
              />
              {item.property_title || item.property_id ? (
                <InfoRow
                  icon="business-outline"
                  label="Property"
                  value={item.property_title || `Property #${item.property_id}`}
                />
              ) : null}
              <InfoRow
                icon="alert-circle-outline"
                label="Original rejection"
                value={item.original_rejection_reason || 'Not provided'}
              />

              {item.status === 'pending' ? (
                <PremiumButton
                  title="Mark under review"
                  variant="secondary"
                  loading={actionId === `${item.id}-under_review`}
                  onPress={() => markUnderReview(item)}
                  style={styles.fullButton}
                />
              ) : null}

              {canResolve ? (
                <View style={styles.actions}>
                  <PremiumButton
                    title="Uphold"
                    loading={actionId === `${item.id}-details-upheld`}
                    onPress={() => openFinalReview(item, 'upheld')}
                    style={styles.actionButton}
                  />
                  <PremiumButton
                    title="Dismiss"
                    variant="danger"
                    loading={actionId === `${item.id}-details-dismissed`}
                    onPress={() => openFinalReview(item, 'dismissed')}
                    style={styles.actionButton}
                  />
                </View>
              ) : null}
            </PremiumCard>
          );
        }}
      />

      <OperationNoteModal
        visible={Boolean(reviewAction)}
        title={reviewAction?.status === 'upheld' ? 'Uphold appeal' : 'Dismiss appeal'}
        message={`Record the reason for the final decision on appeal #${reviewAction?.appeal?.id || ''}.`}
        label="Review note"
        placeholder="Explain this appeal decision"
        confirmText={reviewAction?.status === 'upheld' ? 'Uphold appeal' : 'Dismiss appeal'}
        icon="scale-outline"
        variant={reviewAction?.status === 'dismissed' ? 'danger' : 'primary'}
        loading={Boolean(actionId)}
        onCancel={() => setReviewAction(null)}
        onConfirm={submitReview}
      />
    </>
  );
};

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filter: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.white,
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
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    textTransform: 'capitalize',
  },
  appellant: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  fullButton: {
    marginTop: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
  },
});

export default AdminAppealsScreen;
