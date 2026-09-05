import React, { useCallback, useMemo, useState } from 'react';
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
import { marketingOpsService } from '../../services/marketingOpsService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

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

const DiasporaDeskScreen = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('flag');
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await marketingOpsService.diasporaOverview();
      const data = response?.data || {};
      setStats(data.stats || {});
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load the diaspora overview'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    if (tab === 'flag') return users.filter((u) => u.review_flag);
    if (tab === 'reviewed') return users.filter((u) => u.reviewed);
    return users;
  }, [tab, users]);

  const dismiss = async () => {
    if (!modalUser) return;
    setBusy(true);
    setError('');
    try {
      const response = await marketingOpsService.dismissDiasporaFlag(modalUser.id, notes.trim());
      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Flag dismissed' });
        setModalUser(null);
        setNotes('');
        await load();
      } else {
        setError(response?.message || 'Could not dismiss the flag.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not dismiss the flag.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading diaspora overview" />;
  }

  const pending = Number(stats.nigerian_funded_pending || 0);
  const total = Number(stats.total_diaspora || 0);

  return (
    <>
      <PremiumListScreen
        data={visible}
        keyExtractor={(item) => String(item.id)}
        refreshing={false}
        onRefresh={load}
        header={
          <>
            <PremiumHero
              eyebrow="Super admin"
              title="Diaspora desk"
              subtitle="Review diaspora-registered users funded with Nigerian cards."
              icon="globe-outline"
            />

            <View style={styles.metricRow}>
              <View style={[styles.metric, styles.metricAccent]}>
                <AppText style={styles.metricValue}>{pending}</AppText>
                <AppText style={styles.metricLabel}>Pending flag</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>{total}</AppText>
                <AppText style={styles.metricLabel}>Diaspora total</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>{Number(stats.nigerian_funded_total || 0)}</AppText>
                <AppText style={styles.metricLabel}>NG-funded</AppText>
              </View>
            </View>

            <View style={styles.tabRow}>
              {[
                { key: 'flag', label: 'Needs review' },
                { key: 'reviewed', label: 'Reviewed' },
                { key: 'all', label: 'All' },
              ].map((t) => {
                const active = tab === t.key;
                return (
                  <PremiumButton
                    key={t.key}
                    title={t.label}
                    variant={active ? 'primary' : 'secondary'}
                    onPress={() => setTab(t.key)}
                    style={styles.tabButton}
                  />
                );
              })}
            </View>
          </>
        }
        emptyTitle="Nothing to review"
        emptyMessage="No diaspora users match this filter."
        emptyIcon="globe-outline"
        renderItem={({ item }) => (
          <PremiumCard>
            <View style={styles.cardTop}>
              <View style={styles.cardCopy}>
                <AppText style={styles.cardTitle}>{item.full_name || `User #${item.id}`}</AppText>
                <AppText style={styles.cardMeta}>{item.email || ''}{item.phone ? ` · ${item.phone}` : ''}</AppText>
              </View>
              {item.review_flag ? (
                <StatusPill label="Review" color={colors.danger} />
              ) : item.reviewed ? (
                <StatusPill label="Reviewed" color={colors.success} />
              ) : null}
            </View>
            <InfoRow icon="airplane-outline" label="Diaspora country" value={item.diaspora_country || '—'} />
            <InfoRow icon="card-outline" label="Billing country" value={item.billing_country || '—'} />
            {item.card_brand ? (
              <InfoRow icon="card-outline" label="Card brand" value={item.card_brand} />
            ) : null}
            {item.diaspora_review_notes ? (
              <InfoRow icon="document-text-outline" label="Review notes" value={item.diaspora_review_notes} />
            ) : null}
            {item.created_at ? (
              <InfoRow icon="time-outline" label="Registered" value={formatDate(item.created_at)} />
            ) : null}

            {item.review_flag ? (
              <PremiumButton
                title="Dismiss flag"
                onPress={() => {
                  setModalUser(item);
                  setNotes('');
                  setError('');
                }}
                icon="checkmark-circle-outline"
                style={styles.dismissBtn}
              />
            ) : null}
          </PremiumCard>
        )}
      />

      {modalUser ? (
        <Modal transparent visible animationType="fade" onRequestClose={() => setModalUser(null)}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <AppText style={styles.modalTitle}>Dismiss review flag</AppText>
              <AppText style={styles.modalSubtitle}>
                {modalUser.full_name || `User #${modalUser.id}`} · {modalUser.diaspora_country || '—'}
              </AppText>
              <Input
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Why is this flag being dismissed?"
                multiline
                numberOfLines={3}
                containerStyle={styles.fieldGap}
              />
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <View style={styles.modalActions}>
                <PremiumButton
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setModalUser(null)}
                  disabled={busy}
                  style={styles.actionButton}
                />
                <PremiumButton
                  title={busy ? 'Working…' : 'Dismiss'}
                  onPress={dismiss}
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
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricAccent: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },
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
  dismissBtn: {
    marginTop: 12,
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
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
});

export default DiasporaDeskScreen;
