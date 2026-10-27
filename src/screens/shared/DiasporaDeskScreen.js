import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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
import { colors, radius, typography, typeScale } from '../../theme';
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
  const interfaceLanguage = useInterfaceLanguage();
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
        text1: ui("Failed"),
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
  }, [tab, users, interfaceLanguage]);

  const dismiss = async () => {
    if (!modalUser) return;
    setBusy(true);
    setError('');
    try {
      const response = await marketingOpsService.dismissDiasporaFlag(modalUser.id, notes.trim());
      if (response?.success) {
        Toast.show({ type: 'success', text1: ui("Flag dismissed") });
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
    return <PremiumCenter loading title={ui("Loading diaspora overview")} />;
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
              eyebrow={ui("Super admin")}
              title={ui("Diaspora desk")}
              subtitle={ui("Review diaspora-registered users funded with Nigerian cards.")}
              icon="globe-outline"
            />

            <View style={styles.metricRow}>
              <View style={[styles.metric, styles.metricAccent]}>
                <AppText style={styles.metricValue}>{pending}</AppText>
                <AppText style={styles.metricLabel}>{ui("Pending flag")}</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>{total}</AppText>
                <AppText style={styles.metricLabel}>{ui("Diaspora total")}</AppText>
              </View>
              <View style={styles.metric}>
                <AppText style={styles.metricValue}>{Number(stats.nigerian_funded_total || 0)}</AppText>
                <AppText style={styles.metricLabel}>{ui("NG-funded")}</AppText>
              </View>
            </View>

            <View style={styles.tabRow}>
              {[
                { key: 'flag', label: ui("Needs review") },
                { key: 'reviewed', label: ui("Reviewed") },
                { key: 'all', label: ui("All") },
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
        emptyTitle={ui("Nothing to review")}
        emptyMessage={ui("No diaspora users match this filter.")}
        emptyIcon="globe-outline"
        renderItem={({ item }) => (
          <PremiumCard>
            <View style={styles.cardTop}>
              <View style={styles.cardCopy}>
                <AppText style={styles.cardTitle}>{item.full_name || ui("User #{value0}", {value0: (item.id)})}</AppText>
                <AppText style={styles.cardMeta}>{item.email || ''}{item.phone ? ui(" · {value0}", {value0: (item.phone)}) : ''}</AppText>
              </View>
              {item.review_flag ? (
                <StatusPill label={ui("Review")} color={colors.danger} />
              ) : item.reviewed ? (
                <StatusPill label={ui("Reviewed")} color={colors.success} />
              ) : null}
            </View>
            <InfoRow icon="airplane-outline" label={ui("Diaspora country")} value={item.diaspora_country || '—'} />
            <InfoRow icon="card-outline" label={ui("Billing country")} value={item.billing_country || '—'} />
            {item.card_brand ? (
              <InfoRow icon="card-outline" label={ui("Card brand")} value={item.card_brand} />
            ) : null}
            {item.diaspora_review_notes ? (
              <InfoRow icon="document-text-outline" label={ui("Review notes")} value={item.diaspora_review_notes} />
            ) : null}
            {item.created_at ? (
              <InfoRow icon="time-outline" label={ui("Registered")} value={formatDate(item.created_at)} />
            ) : null}

            {item.review_flag ? (
              <PremiumButton
                title={ui("Dismiss flag")}
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
              <AppText style={styles.modalTitle}>{ui("Dismiss review flag")}</AppText>
              <AppText style={styles.modalSubtitle}>
                {modalUser.full_name || ui("User #{value0}", {value0: (modalUser.id)})} · {modalUser.diaspora_country || '—'}
              </AppText>
              <Input
                label={ui("Notes (optional)")}
                value={notes}
                onChangeText={setNotes}
                placeholder={ui("Why is this flag being dismissed?")}
                multiline
                numberOfLines={3}
                containerStyle={styles.fieldGap}
              />
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <View style={styles.modalActions}>
                <PremiumButton
                  title={ui("Cancel")}
                  variant="ghost"
                  onPress={() => setModalUser(null)}
                  disabled={busy}
                  style={styles.actionButton}
                />
                <PremiumButton
                  title={busy ? 'Working…' : ui("Dismiss")}
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
    fontSize: typeScale.lg,
    lineHeight: 28,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontFamily: typography.semibold,
    fontSize: typeScale.md,
    lineHeight: 26,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 4,
  },
  fieldGap: {
    marginTop: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
