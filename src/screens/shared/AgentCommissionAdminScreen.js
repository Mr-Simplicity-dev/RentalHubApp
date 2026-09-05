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
import { agentCommissionAdminService } from '../../services/agentCommissionAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const formatNaira = (value) =>
  `₦${Math.abs(Number(value || 0)).toLocaleString()}`;

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
  earned: colors.muted,
  pending_verification: colors.blue,
  verified: '#B7791F',
  paid: colors.success,
  reversed: colors.danger,
};

const STATUS_TABS = ['pending_verification', 'verified', 'paid', 'reversed'];

const AgentCommissionAdminScreen = () => {
  const [tab, setTab] = useState('pending_verification');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { item, action }
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await agentCommissionAdminService.listCommissions(tab);
      setItems(pickList(response?.data || response, ['data']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load commissions'),
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
    setReason('');
    setError('');
  };

  const submit = async () => {
    if (!modal) return;
    setBusy(true);
    setError('');
    try {
      if (modal.action === 'verify') {
        await agentCommissionAdminService.verifyCommission(modal.item.id);
        Toast.show({ type: 'success', text1: 'Commission verified' });
      } else {
        await agentCommissionAdminService.reverseCommission(
          modal.item.id,
          reason.trim()
        );
        Toast.show({ type: 'success', text1: 'Commission reversed' });
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not complete the action'));
    } finally {
      setBusy(false);
    }
  };

  if (loading && items.length === 0) {
    return <PremiumCenter loading title="Loading commissions" />;
  }

  const tabBar = (
    <View style={styles.tabRow}>
      {STATUS_TABS.map((key) => {
        const active = tab === key;
        return (
          <PremiumButton
            key={key}
            title={key.replace(/_/g, ' ')}
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
              title="Agent commissions"
              subtitle="Verify, monitor and reverse agent commission ledger entries."
              icon="cash-outline"
            />
            {tabBar}
          </>
        }
        emptyTitle={`No ${tab.replace(/_/g, ' ')} commissions`}
        emptyMessage="Commission ledger entries will appear here."
        emptyIcon="cash-outline"
        renderItem={({ item }) => {
          const color = STATUS_COLORS[item.status] || colors.blue;
          const signed = Number(item.amount || 0) < 0;
          return (
            <PremiumCard>
              <View style={styles.cardTop}>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>{item.agent_name || `Agent #${item.agent_user_id}`}</AppText>
                  <AppText style={styles.cardMeta}>
                    {String(item.transaction_type || 'commission').replace(/_/g, ' ')} ·{' '}
                    {formatDate(item.created_at)}
                  </AppText>
                </View>
                <StatusPill label={item.status} color={color} />
              </View>
              <InfoRow
                icon="cash-outline"
                label="Amount"
                value={`${signed ? '-' : ''}${formatNaira(item.amount)}`}
              />
              {item.description ? (
                <InfoRow icon="chatbubble-outline" label="Description" value={item.description} />
              ) : null}
              {item.landlord_name ? (
                <InfoRow icon="business-outline" label="Landlord" value={item.landlord_name} />
              ) : null}
              {item.notes ? <InfoRow icon="document-text-outline" label="Notes" value={item.notes} /> : null}

              <View style={styles.actions}>
                {item.status === 'pending_verification' ? (
                  <PremiumButton
                    title="Verify"
                    onPress={() => openAction(item, 'verify')}
                    icon="shield-checkmark-outline"
                    style={styles.actionButton}
                  />
                ) : null}
                {item.status !== 'reversed' ? (
                  <PremiumButton
                    title="Reverse"
                    variant="ghost"
                    onPress={() => openAction(item, 'reverse')}
                    icon="arrow-undo-outline"
                    style={styles.actionButton}
                  />
                ) : null}
              </View>
            </PremiumCard>
          );
        }}
      />

      {modal ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setModal(null)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>
                {modal.action === 'verify' ? 'Verify commission' : 'Reverse commission'}
              </AppText>
              <AppText style={styles.modalSubtitle}>
                {modal.item.agent_name || `Commission #${modal.item.id}`} · {formatNaira(modal.item.amount)}
              </AppText>

              {modal.action === 'reverse' ? (
                <Input
                  label="Reason (optional)"
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Why is this commission being reversed?"
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
    flexWrap: 'wrap',
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
    textTransform: 'capitalize',
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

export default AgentCommissionAdminScreen;
