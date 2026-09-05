import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
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
import { rentSavingsAdminService } from '../../services/rentSavingsAdminService';
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
};

const RentSavingsAdminScreen = () => {
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { item, action }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await rentSavingsAdminService.getEarlyWithdrawalRequests({
        status: tab,
      });
      setItems(pickList(response?.data || response, ['data']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load withdrawal requests'),
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

  const openAction = (item, action) => {
    setModal({ item, action });
    setNote('');
    setError('');
  };

  const submit = async () => {
    if (!modal) return;
    if (modal.action === 'reject' && !note.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (modal.action === 'approve') {
        await rentSavingsAdminService.approveEarlyWithdrawal(modal.item.id);
        Toast.show({ type: 'success', text1: 'Withdrawal approved' });
      } else {
        await rentSavingsAdminService.rejectEarlyWithdrawal(modal.item.id, note.trim());
        Toast.show({ type: 'success', text1: 'Withdrawal rejected' });
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update the request'));
    } finally {
      setBusy(false);
    }
  };

  if (loading && items.length === 0) {
    return <PremiumCenter loading title="Loading requests" />;
  }

  const tabBar = (
    <View style={styles.tabRow}>
      {['pending', 'approved', 'rejected'].map((key) => {
        const active = tab === key;
        return (
          <PremiumButton
            key={key}
            title={key[0].toUpperCase() + key.slice(1)}
            variant={active ? 'primary' : 'secondary'}
            onPress={() => setTab(key)}
            style={styles.tabButton}
          />
        );
      })}
    </View>
  );

  return (
    <>
      <PremiumListScreen
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshing={false}
        onRefresh={load}
        header={
          <>
            <PremiumHero
              eyebrow="Super admin"
              title="Rent savings withdrawals"
              subtitle="Approve or reject tenant early-withdrawal requests from rent savings plans."
              icon="wallet-outline"
            />
            {tabBar}
          </>
        }
        emptyTitle={`No ${tab} requests`}
        emptyMessage="Early withdrawal requests will appear here."
        emptyIcon="cash-outline"
        renderItem={({ item }) => {
          const color = STATUS_COLORS[item.status] || colors.blue;
          return (
            <PremiumCard>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>
                    {item.property_title || `Request #${item.id}`}
                  </AppText>
                  <AppText style={styles.cardMeta}>
                    Plan #{item.plan_id} · requested {formatDate(item.requested_at || item.created_at)}
                  </AppText>
                </View>
                <StatusPill label={item.status} color={color} />
              </View>
              <InfoRow icon="cash-outline" label="Requested amount" value={formatNaira(item.amount || item.requested_amount)} />
              {item.reason ? (
                <InfoRow icon="chatbubble-outline" label="Reason" value={item.reason} />
              ) : null}
              {item.admin_note ? (
                <InfoRow icon="document-text-outline" label="Admin note" value={item.admin_note} />
              ) : null}

              {tab === 'pending' ? (
                <View style={styles.actions}>
                  <PremiumButton
                    title="Approve"
                    onPress={() => openAction(item, 'approve')}
                    icon="checkmark-circle-outline"
                    style={styles.actionButton}
                  />
                  <PremiumButton
                    title="Reject"
                    variant="ghost"
                    onPress={() => openAction(item, 'reject')}
                    icon="close-circle-outline"
                    style={styles.actionButton}
                  />
                </View>
              ) : null}
            </PremiumCard>
          );
        }}
      />

      {modal ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setModal(null)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>
                {modal.action === 'approve' ? 'Approve withdrawal' : 'Reject withdrawal'}
              </AppText>
              <AppText style={styles.modalSubtitle}>
                {modal.item.property_title || `Request #${modal.item.id}`} ·{' '}
                {formatNaira(modal.item.amount || modal.item.requested_amount)}
              </AppText>

              {modal.action === 'reject' ? (
                <Input
                  label="Rejection reason"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Explain why this request is being rejected"
                  multiline
                  numberOfLines={3}
                  containerStyle={styles.fieldGap}
                />
              ) : null}

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
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    minWidth: 90,
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
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
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

export default RentSavingsAdminScreen;
