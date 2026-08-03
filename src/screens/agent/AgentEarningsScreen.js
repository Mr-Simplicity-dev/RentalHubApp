import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
import { useTourTarget } from '../../components/tour/TourTarget';
const AgentEarningsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const earningsTourTarget = useTourTarget('agent_commissions', { padding: 6, radius: 18 });
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(null);
  const [history, setHistory] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [earningsRes, historyRes] = await Promise.all([
        agentService.getEarnings(user.id),
        agentService.getCommissionHistory(user.id, { limit: 30 }),
      ]);

      const earningsRows = pickList(earningsRes, ['data']);
      setEarnings(earningsRows[0] || null);
      setHistory(pickList(historyRes, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load earnings'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const amount = (value) => `₦${Number(value || 0).toLocaleString()}`;
  const statusStyle = (status) => {
    const value = String(status || '').toLowerCase();
    if (['paid', 'completed', 'approved', 'successful'].includes(value)) return styles.statusSuccess;
    if (['failed', 'rejected', 'cancelled'].includes(value)) return styles.statusDanger;
    return styles.statusPending;
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.blue} />}
    >
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={21} color={colors.ink} />
        </TouchableOpacity>
        <AppText style={styles.topTitle}>Earnings</AppText>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Icon name="refresh" size={20} color={colors.blue} />
        </TouchableOpacity>
      </View>

      <View {...earningsTourTarget} style={styles.hero}>
        <View style={styles.heroIcon}><Icon name="wallet-outline" size={22} color={colors.gold} /></View>
        <AppText style={styles.heroLabel}>TOTAL COMMISSION EARNED</AppText>
        <AppText style={styles.heroAmount}>{amount(earnings?.total_earned)}</AppText>
        <AppText style={styles.heroCaption}>A clear record of every commission generated.</AppText>
      </View>

      <View style={styles.metrics}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.paidIcon]}><Icon name="checkmark-circle-outline" size={19} color={colors.success} /></View>
          <AppText style={styles.statLabel}>Paid</AppText>
          <AppText style={styles.statValue}>{amount(earnings?.total_paid)}</AppText>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.pendingIcon]}><Icon name="time-outline" size={19} color="#A66B00" /></View>
          <AppText style={styles.statLabel}>Pending</AppText>
          <AppText style={styles.statValue}>{amount(earnings?.total_pending)}</AppText>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.countIcon]}><Icon name="receipt-outline" size={19} color={colors.blue} /></View>
          <AppText style={styles.statLabel}>Transactions</AppText>
          <AppText style={styles.statValue}>{Number(earnings?.transaction_count || 0)}</AppText>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('AgentWithdrawals')}
      >
        <Icon name="cash-outline" size={19} color={colors.white} />
        <AppText style={styles.primaryBtnText}>Request withdrawal</AppText>
        <Icon name="arrow-forward" size={18} color={colors.white} />
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>Recent activity</AppText>
        <AppText style={styles.sectionCount}>{history.length} entries</AppText>
      </View>
      {loading && history.length === 0 ? <ActivityIndicator color={colors.blue} /> : null}

      {!loading && history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="document-text-outline" size={28} color={colors.muted} />
          <AppText style={styles.emptyTitle}>No commission entries yet</AppText>
          <AppText style={styles.muted}>New commissions will appear here automatically.</AppText>
        </View>
      ) : null}

      {history.map((entry) => (
        <View key={entry.id} style={styles.entryCard}>
          <View style={styles.entryTop}>
            <View style={styles.entryIcon}><Icon name="trending-up" size={18} color={colors.blue} /></View>
            <View style={styles.entryCopy}>
              <AppText style={styles.entryType}>{String(entry.transaction_type || 'Commission').replace(/_/g, ' ')}</AppText>
              <AppText style={styles.entryMeta}>
                {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
              </AppText>
            </View>
            <AppText style={styles.entryAmount}>+{amount(entry.amount)}</AppText>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, statusStyle(entry.status)]}>
              <AppText style={styles.statusText}>{entry.status || 'pending'}</AppText>
            </View>
            {entry.payment_status ? (
              <AppText style={styles.paymentText}>Payment: {entry.payment_status}</AppText>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  refreshButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: typography.semibold, fontSize: 18, color: colors.ink },
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 22, marginBottom: 14, ...shadows.soft },
  heroIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroLabel: { fontFamily: typography.semibold, fontSize: 13, letterSpacing: 1.25, color: '#AFC3E6' },
  heroAmount: { marginTop: 7, fontFamily: typography.bold, fontSize: 36, color: colors.white },
  heroCaption: { marginTop: 8, fontFamily: typography.regular, lineHeight: 20, color: '#B9C9E5' },
  metrics: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  paidIcon: { backgroundColor: '#E9F8F1' },
  pendingIcon: { backgroundColor: '#FFF7DF' },
  countIcon: { backgroundColor: colors.surfaceBlue },
  statLabel: { fontFamily: typography.regular, fontSize: 13, color: colors.muted },
  statValue: { marginTop: 4, fontFamily: typography.bold, fontSize: 14, color: colors.ink },
  primaryBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  primaryBtnText: { flex: 1, marginLeft: 10, color: colors.white, fontFamily: typography.semibold },
  sectionHeader: { marginTop: 24, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: typography.bold, fontSize: 18, color: colors.ink },
  sectionCount: { fontFamily: typography.medium, fontSize: 13, color: colors.muted },
  muted: { marginTop: 7, textAlign: 'center', fontFamily: typography.regular, color: colors.muted },
  emptyCard: { alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 24 },
  emptyTitle: { marginTop: 10, fontFamily: typography.semibold, color: colors.ink },
  entryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  entryTop: { flexDirection: 'row', alignItems: 'center' },
  entryIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceBlue, alignItems: 'center', justifyContent: 'center' },
  entryCopy: { flex: 1, marginHorizontal: 10 },
  entryType: { fontFamily: typography.semibold, textTransform: 'capitalize', color: colors.ink },
  entryAmount: { fontFamily: typography.bold, color: colors.success },
  entryMeta: { marginTop: 4, fontFamily: typography.regular, color: colors.muted, fontSize: 13 },
  statusRow: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: radius.pill },
  statusSuccess: { backgroundColor: '#E9F8F1' },
  statusDanger: { backgroundColor: '#FDECEA' },
  statusPending: { backgroundColor: '#FFF7DF' },
  statusText: { fontFamily: typography.semibold, fontSize: 13, textTransform: 'capitalize', color: colors.text },
  paymentText: { fontFamily: typography.regular, fontSize: 13, color: colors.muted },
});

export default AgentEarningsScreen;
