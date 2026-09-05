import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { superModerationService } from '../../services/superModerationService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const RATING_COLORS = {
  pending: colors.blue,
  approved: colors.success,
  hidden: colors.muted,
  rejected: colors.danger,
};

const REVALIDATION_COLORS = {
  requested: colors.blue,
  submitted: '#B7791F',
  approved: colors.success,
  rejected: colors.danger,
  cancelled: colors.muted,
};

const ModerationHubScreen = () => {
  const [tab, setTab] = useState('ratings');
  const [ratings, setRatings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { kind, item, action }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'ratings') {
        const response = await superModerationService.listRatings();
        setRatings(Array.isArray(response?.data?.ratings) ? response.data.ratings : []);
      } else {
        const response = await superModerationService.listCredentialRevalidations();
        setRequests(Array.isArray(response?.data) ? response.data : []);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load moderation queue'),
      });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openAction = (kind, item, action) => {
    setModal({ kind, item, action });
    setNote('');
    setError('');
  };

  const submit = async () => {
    if (!modal) return;
    const { kind, item, action } = modal;

    if (kind === 'credential' && action === 'rejected' && note.trim().length < 5) {
      setError('Add a clear reason before returning the credentials.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (kind === 'rating') {
        await superModerationService.moderateRating(item.id, {
          status: action,
          note: note.trim() || undefined,
        });
        Toast.show({ type: 'success', text1: `Rating ${action}` });
      } else {
        await superModerationService.reviewCredentialRevalidation(item.id, {
          decision: action,
          review_note: note.trim(),
        });
        Toast.show({
          type: 'success',
          text1: action === 'approved' ? 'Credentials approved' : 'Credentials returned',
        });
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not complete the action'));
    } finally {
      setBusy(false);
    }
  };

  const renderActions = (kind, item) => {
    if (kind === 'credential') {
      if (item.status !== 'submitted') return null;
      return (
        <View style={styles.actions}>
          <PremiumButton
            title="Approve"
            onPress={() => openAction(kind, item, 'approved')}
            icon="checkmark-circle-outline"
            style={styles.actionButton}
          />
          <PremiumButton
            title="Return"
            variant="ghost"
            onPress={() => openAction(kind, item, 'rejected')}
            icon="arrow-undo-outline"
            style={styles.actionButton}
          />
        </View>
      );
    }

    const canApprove = item.status !== 'approved';
    const canHide = item.status !== 'hidden';
    const canReject = item.status === 'pending';
    if (!canApprove && !canHide && !canReject) return null;
    return (
      <View style={styles.actions}>
        {canApprove ? (
          <PremiumButton
            title="Approve"
            onPress={() => openAction(kind, item, 'approved')}
            icon="checkmark-circle-outline"
            style={styles.actionButton}
          />
        ) : null}
        {canHide ? (
          <PremiumButton
            title="Hide"
            variant="secondary"
            onPress={() => openAction(kind, item, 'hidden')}
            icon="eye-off-outline"
            style={styles.actionButton}
          />
        ) : null}
        {canReject ? (
          <PremiumButton
            title="Reject"
            variant="ghost"
            onPress={() => openAction(kind, item, 'rejected')}
            icon="close-circle-outline"
            style={styles.actionButton}
          />
        ) : null}
      </View>
    );
  };

  if (loading) {
    return <PremiumCenter loading title="Loading moderation queue" />;
  }

  const header = (
    <PremiumHero
      eyebrow="Super admin"
      title="Moderation"
      subtitle="Approve or hide public ratings, and review credential revalidation submissions."
      icon="shield-checkmark-outline"
    />
  );

  const tabBar = (
    <View style={styles.tabRow}>
      {[
        { key: 'ratings', label: 'Ratings' },
        { key: 'credentials', label: 'Credential revalidation' },
      ].map((t) => {
        const activeTab = tab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.85}
            onPress={() => setTab(t.key)}
            style={[styles.tab, activeTab && styles.tabActive]}
          >
            <AppText style={[styles.tabText, activeTab && styles.tabTextActive]}>{t.label}</AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <>
      <PremiumListScreen
        data={tab === 'ratings' ? ratings : requests}
        keyExtractor={(item) => String(item.id)}
        refreshing={false}
        onRefresh={load}
        header={
          <>
            {header}
            {tabBar}
          </>
        }
        emptyTitle={tab === 'ratings' ? 'No ratings' : 'No revalidation requests'}
        emptyMessage={
          tab === 'ratings'
            ? 'New tenant and landlord ratings will appear here.'
            : 'Credential revalidation requests will appear here.'
        }
        renderItem={({ item }) => {
          if (tab === 'ratings') {
            const color = RATING_COLORS[item.status] || colors.blue;
            return (
              <PremiumCard>
                <View style={styles.cardTop}>
                  <View style={styles.cardCopy}>
                    <AppText style={styles.cardTitle}>
                      {item.source_title || item.rating_context || 'Platform rating'}
                    </AppText>
                    <AppText style={styles.cardMeta}>{item.full_name || `User #${item.user_id}`}</AppText>
                  </View>
                  <StatusPill label={item.status} color={color} />
                </View>
                <InfoRow icon="star-outline" label="Stars" value={String(item.stars || 0)} />
                {item.comment ? (
                  <InfoRow icon="chatbubble-outline" label="Comment" value={item.comment} />
                ) : null}
                <InfoRow
                  icon="location-outline"
                  label="Location"
                  value={[item.state_name, item.lga_name, item.city].filter(Boolean).join(', ') || '—'}
                />
                {item.created_at ? (
                  <InfoRow
                    icon="time-outline"
                    label="Submitted"
                    value={new Date(item.created_at).toLocaleString()}
                  />
                ) : null}
                {renderActions('rating', item)}
              </PremiumCard>
            );
          }

          const color = REVALIDATION_COLORS[item.status] || colors.blue;
          const fields = Array.isArray(item.requested_fields)
            ? item.requested_fields.join(', ')
            : '';
          return (
            <PremiumCard>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>
                    {item.user_name || `User #${item.user_id}`}
                  </AppText>
                  {item.email ? <AppText style={styles.cardMeta}>{item.email}</AppText> : null}
                </View>
                <StatusPill label={item.status} color={color} />
              </View>
              {fields ? (
                <InfoRow icon="document-text-outline" label="Requested fields" value={fields} />
              ) : null}
              {item.reason ? <InfoRow icon="reader-outline" label="Reason" value={item.reason} /> : null}
              {item.review_note ? (
                <InfoRow icon="chatbubble-outline" label="Review note" value={item.review_note} />
              ) : null}
              {item.created_at ? (
                <InfoRow
                  icon="time-outline"
                  label="Requested"
                  value={new Date(item.created_at).toLocaleString()}
                />
              ) : null}
              {renderActions('credential', item)}
            </PremiumCard>
          );
        }}
      />

      {modal ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setModal(null)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>
                {modal.action === 'approved'
                  ? 'Approve'
                  : modal.action === 'hidden'
                    ? 'Hide rating'
                    : modal.action === 'rejected' && modal.kind === 'rating'
                      ? 'Reject rating'
                      : 'Return for correction'}
              </AppText>
              <AppText style={styles.modalSubtitle}>
                {modal.kind === 'rating'
                  ? modal.item.comment || modal.item.source_title || `Rating #${modal.item.id}`
                  : `Credential revalidation #${modal.item.id}`}
              </AppText>

              <Input
                label={
                  modal.action === 'approved'
                    ? 'Note (optional)'
                    : modal.action === 'hidden'
                      ? 'Reason for hiding (optional)'
                      : 'Reason (required for returns)'
                }
                value={note}
                onChangeText={setNote}
                placeholder="Optional note for the audit record"
                multiline
                numberOfLines={3}
                containerStyle={styles.fieldGap}
              />

              {error ? <AppText style={styles.error}>{error}</AppText> : null}

              <View style={styles.modalActions}>
                <PremiumButton
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setModal(null)}
                  disabled={busy}
                  style={styles.actionButton}
                />
                <PremiumButton
                  title={busy ? 'Working…' : 'Confirm'}
                  onPress={submit}
                  loading={busy}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  tabActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  tabText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  listHeaderSpacer: {
    height: 4,
  },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 110,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 26, 61, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  fieldGap: {
    marginTop: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});

export default ModerationHubScreen;
