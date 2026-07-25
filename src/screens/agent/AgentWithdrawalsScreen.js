import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { AuthContext } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const AgentWithdrawalsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState({});
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ amount: '', requestReason: '' });

  const landlordId = profile?.agent_assignment?.landlord_user_id;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadData = async () => {
    setLoading(true);
    try {
      const profileRes = await agentService.getProfile();
      const profileData = pickObject(profileRes, ['data']) || null;
      setProfile(profileData);

      const currentLandlordId = profileData?.agent_assignment?.landlord_user_id;
      if (!currentLandlordId) {
        setSummary({});
        setRequests([]);
        return;
      }

      const [summaryRes, requestsRes] = await Promise.all([
        agentService.getWithdrawalSummary(user.id, currentLandlordId),
        agentService.getWithdrawalRequests(user.id, { landlordId: currentLandlordId, limit: 30 }),
      ]);

      setSummary(pickObject(summaryRes, ['data']) || {});
      setRequests(pickList(requestsRes, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load withdrawals'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const submitRequest = async () => {
    const amount = Number(form.amount || 0);
    if (!landlordId) {
      Toast.show({ type: 'error', text1: 'No landlord assignment found' });
      return;
    }
    if (amount <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }

    setSubmitting(true);
    try {
      await agentService.createWithdrawalRequest(user.id, {
        landlordId,
        amount,
        withdrawalMethod: 'bank_transfer',
        requestReason: form.requestReason,
      });

      Toast.show({ type: 'success', text1: 'Withdrawal request submitted' });
      setForm({ amount: '', requestReason: '' });
      await loadData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Request failed',
        text2: getErrorMessage(error, 'Could not submit withdrawal request'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

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
        <Text style={styles.topTitle}>Withdraw funds</Text>
        <View style={styles.topSpacer} />
      </View>

      {!landlordId ? (
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}><Icon name="alert-circle-outline" size={24} color="#A66B00" /></View>
          <Text style={styles.warningTitle}>No assigned landlord</Text>
          <Text style={styles.warningText}>You need an active assignment before withdrawals can be requested.</Text>
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>PAYOUT CENTRE</Text>
            <Text style={styles.title}>Move your earnings</Text>
            <Text style={styles.subtitle}>Request a secure bank transfer from your commission balance.</Text>
          </View>

          <View style={styles.summaryCard}>
            {[
              ['Pending', summary.pending_amount, 'time-outline', '#A66B00'],
              ['Approved', summary.approved_amount, 'checkmark-circle-outline', colors.blue],
              ['Processed', summary.processed_amount, 'shield-checkmark-outline', colors.success],
            ].map(([label, value, icon, color]) => (
              <View key={label} style={styles.summaryItem}>
                <Icon name={icon} size={18} color={color} />
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue}>₦{Number(value || 0).toLocaleString()}</Text>
              </View>
            ))}
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeading}>
              <View style={styles.formIcon}><Icon name="cash-outline" size={20} color={colors.blue} /></View>
              <View>
                <Text style={styles.formTitle}>New request</Text>
                <Text style={styles.formSubtitle}>Funds are sent by bank transfer.</Text>
              </View>
            </View>
            <Input
              label="Amount (NGN)"
              value={form.amount}
              keyboardType="number-pad"
              onChangeText={(value) => setForm((prev) => ({ ...prev, amount: value }))}
              placeholder="50000"
            />
            <Input
              label="Reason (optional)"
              value={form.requestReason}
              onChangeText={(value) => setForm((prev) => ({ ...prev, requestReason: value }))}
              placeholder="Monthly payout"
            />
            <Button title="Submit Withdrawal Request" onPress={submitRequest} loading={submitting} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Request history</Text>
            <Text style={styles.sectionCount}>{requests.length} requests</Text>
          </View>
          {requests.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.empty}>No withdrawal requests yet.</Text></View>
          ) : null}

          {requests.map((item) => (
            <View key={String(item.id)} style={styles.row}>
              <View style={styles.rowTop}>
                <View>
                  <Text style={styles.amount}>₦{Number(item.amount || 0).toLocaleString()}</Text>
                  <Text style={styles.meta}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.statusPill}><Text style={styles.statusText}>{item.status || 'pending'}</Text></View>
              </View>
              {item.reason_for_rejection ? (
                <Text style={styles.reject}>Reason: {item.reason_for_rejection}</Text>
              ) : null}
            </View>
          ))}
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 18, paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  topSpacer: { width: 42 },
  topTitle: { fontFamily: typography.semibold, fontSize: 17, color: colors.ink },
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 22, marginBottom: 12, ...shadows.soft },
  heroEyebrow: { fontFamily: typography.semibold, fontSize: 13, letterSpacing: 1.2, color: colors.gold },
  title: { marginTop: 8, fontFamily: typography.bold, fontSize: 26, color: colors.white },
  subtitle: { marginTop: 7, fontFamily: typography.regular, lineHeight: 20, color: '#B9C9E5' },
  summaryCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginBottom: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: colors.border },
  summaryLabel: { marginTop: 5, fontFamily: typography.regular, fontSize: 13, color: colors.muted },
  summaryValue: { marginTop: 3, fontFamily: typography.bold, fontSize: 13, color: colors.ink },
  formCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  formHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  formIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceBlue, marginRight: 10 },
  formTitle: { fontFamily: typography.semibold, color: colors.ink },
  formSubtitle: { marginTop: 3, fontFamily: typography.regular, fontSize: 13, color: colors.muted },
  sectionHeader: { marginTop: 23, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: typography.bold, fontSize: 18, color: colors.ink },
  sectionCount: { fontFamily: typography.medium, fontSize: 13, color: colors.muted },
  emptyCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 18, alignItems: 'center' },
  empty: { fontFamily: typography.regular, color: colors.muted },
  row: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 9 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontFamily: typography.bold, fontSize: 17, color: colors.ink },
  meta: { marginTop: 4, fontFamily: typography.regular, fontSize: 13, color: colors.muted },
  statusPill: { backgroundColor: '#FFF7DF', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontFamily: typography.semibold, fontSize: 13, textTransform: 'capitalize', color: '#805800' },
  reject: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, fontFamily: typography.regular, color: colors.danger },
  warningCard: { borderWidth: 1, borderColor: '#F2D58A', backgroundColor: '#FFF9E8', borderRadius: radius.lg, padding: 22, alignItems: 'center' },
  warningIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF1C2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  warningTitle: { color: colors.ink, fontFamily: typography.bold, fontSize: 17 },
  warningText: { color: colors.text, fontFamily: typography.regular, textAlign: 'center', lineHeight: 20, marginTop: 6 },
});

export default AgentWithdrawalsScreen;
