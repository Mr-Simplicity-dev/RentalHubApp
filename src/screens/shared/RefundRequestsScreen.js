import React, { useCallback, useContext, useState } from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import {
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { AuthContext } from '../../context/AuthContext';
import { tenancyAdjustmentService } from '../../services/tenancyAdjustmentService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const formatNaira = (value) => `₦${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const STATUS_COLORS = {
  pending: colors.blue,
  approved: colors.success,
  rejected: colors.danger,
  refunded: colors.success,
};

const categoryLabel = (category) =>
  category === 'early_exit_refund' ? 'Relocation refund' : 'Standard refund';

const RefundRequestsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const isLandlord = user?.user_type === 'landlord';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [decision, setDecision] = useState(null); // { item, action: 'approve'|'reject', note, busy }
  const [noteError, setNoteError] = useState('');

  const loadItems = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = isLandlord
        ? await tenancyAdjustmentService.getLandlordRefundRequests('pending')
        : await tenancyAdjustmentService.getMyRefundRequests();
      setItems(pickList(response, ['data']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load refund requests'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLandlord]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const openDecision = (item, action) => {
    setDecision({ item, action, note: '', busy: false });
    setNoteError('');
  };

  const submitDecision = async () => {
    if (!decision) return;
    if (!decision.note.trim()) {
      setNoteError(
        decision.action === 'reject'
          ? 'A reason is required when rejecting a refund.'
          : 'Add a short note for the tenant.'
      );
      return;
    }
    setDecision((prev) => ({ ...prev, busy: true }));
    try {
      if (decision.action === 'approve') {
        await tenancyAdjustmentService.approveRefundRequest(decision.item.id, {
          landlord_note: decision.note.trim(),
        });
        Toast.show({ type: 'success', text1: 'Refund approved' });
      } else {
        await tenancyAdjustmentService.rejectRefundRequest(decision.item.id, decision.note.trim());
        Toast.show({ type: 'success', text1: 'Refund rejected' });
      }
      setDecision(null);
      setNoteError('');
      await loadItems();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not update the request'),
      });
    } finally {
      setDecision((prev) => (prev ? { ...prev, busy: false } : prev));
    }
  };

  const header = (
    <PremiumHero
      eyebrow="Tenancy"
      title={isLandlord ? 'Refund requests' : 'My refund requests'}
      subtitle={
        isLandlord
          ? 'Approve or reject refund requests from your tenants.'
          : 'Track rent refund and relocation requests you have submitted.'
      }
      icon="cash-outline"
    />
  );

  if (loading && items.length === 0) {
    return <PremiumCenter loading title="Loading refund requests" />;
  }

  return (
    <>
      <PremiumListScreen
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshing={refreshing}
        onRefresh={() => loadItems({ refresh: true })}
        header={header}
        emptyTitle={isLandlord ? 'No pending refund requests' : 'No refund requests yet'}
        emptyMessage={
          isLandlord
            ? 'Refund requests from your tenants will appear here.'
            : 'Request a refund on a completed rent payment.'
        }
        emptyIcon="cash-outline"
        ListFooterComponent={
          !isLandlord ? (
            <PremiumButton
              title="Request a refund"
              onPress={() => navigation.navigate('RefundRequest')}
              icon="add-circle-outline"
              style={styles.footerBtn}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.blue;
          return (
            <PremiumCard>
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>
                    {item.property_title || 'Rental property'}
                  </AppText>
                  {isLandlord ? (
                    <AppText style={styles.cardMeta}>
                      {item.tenant_name || 'Tenant'}
                      {item.tenant_phone ? ` · ${item.tenant_phone}` : ''}
                    </AppText>
                  ) : item.landlord_name ? (
                    <AppText style={styles.cardMeta}>{item.landlord_name}</AppText>
                  ) : null}
                </View>
                <StatusPill label={categoryLabel(item.request_category)} color={colors.blue} />
              </View>

              <AppText style={styles.amount}>{formatNaira(item.amount)}</AppText>
              <AppText style={styles.reason}>{item.reason}</AppText>

              {item.requested_move_out_date ? (
                <AppText style={styles.meta}>
                  Move-out {formatDate(item.requested_move_out_date)}
                </AppText>
              ) : null}
              {item.refund_due_at ? (
                <AppText style={styles.meta}>Due by {formatDate(item.refund_due_at)}</AppText>
              ) : null}

              <View style={styles.rowBetween}>
                <StatusPill label={String(item.status || 'pending').replace(/_/g, ' ')} color={statusColor} />
                <AppText style={styles.date}>{formatDate(item.requested_at)}</AppText>
              </View>

              {isLandlord && String(item.status) === 'pending' ? (
                <View style={styles.actions}>
                  <PremiumButton
                    title="Approve"
                    onPress={() => openDecision(item, 'approve')}
                    icon="checkmark-circle-outline"
                    style={styles.actionButton}
                  />
                  <PremiumButton
                    title="Reject"
                    variant="ghost"
                    onPress={() => openDecision(item, 'reject')}
                    icon="close-circle-outline"
                    style={styles.actionButton}
                  />
                </View>
              ) : null}

              {item.landlord_note ? (
                <AppText style={styles.note}>Landlord: {item.landlord_note}</AppText>
              ) : null}
            </PremiumCard>
          );
        }}
      />

      {decision ? (
        <Modal transparent visible animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>
                {decision.action === 'approve' ? 'Approve full refund' : 'Reject refund'}
              </AppText>
              <AppText style={styles.modalSubtitle}>
                {decision.item.property_title || 'Property'} · {formatNaira(decision.item.amount)}
              </AppText>

              <TextInput
                style={styles.noteInput}
                multiline
                numberOfLines={4}
                value={decision.note}
                onChangeText={(text) => {
                  setDecision((prev) => ({ ...prev, note: text }));
                  setNoteError('');
                }}
                placeholder={
                  decision.action === 'approve'
                    ? 'Add a note for the tenant (optional but recommended)'
                    : 'Explain why you are rejecting this refund'
                }
              />
              {noteError ? <AppText style={styles.error}>{noteError}</AppText> : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setDecision(null)}
                >
                  <AppText style={styles.cancelText}>Cancel</AppText>
                </TouchableOpacity>
                <PremiumButton
                  title={decision.busy ? 'Working…' : decision.action === 'approve' ? 'Approve' : 'Reject'}
                  onPress={submitDecision}
                  loading={decision.busy}
                  variant={decision.action === 'approve' ? 'primary' : 'danger'}
                  style={styles.modalConfirm}
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
  footerBtn: {
    marginVertical: 6,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
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
  amount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 8,
  },
  reason: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  date: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
  },
  note: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 10,
  },
  modalOverlay: {
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
  noteInput: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
    marginTop: 14,
    minHeight: 100,
    padding: 12,
    textAlignVertical: 'top',
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  modalConfirm: {
    flex: 1,
  },
});

export default RefundRequestsScreen;
