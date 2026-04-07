import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { AuthContext } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const AgentWithdrawalsScreen = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState({});
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ amount: '', requestReason: '' });

  const landlordId = profile?.agent_assignment?.landlord_user_id;

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
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Withdrawal Requests</Text>
      <Text style={styles.subtitle}>Withdraw from your commission balance</Text>

      {!landlordId ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>No assigned landlord</Text>
          <Text style={styles.warningText}>You need an active assignment before withdrawals can be requested.</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>Pending: N{Number(summary.pending_amount || 0).toLocaleString()}</Text>
            <Text style={styles.summaryText}>Approved: N{Number(summary.approved_amount || 0).toLocaleString()}</Text>
            <Text style={styles.summaryText}>Processed: N{Number(summary.processed_amount || 0).toLocaleString()}</Text>
          </View>

          <View style={styles.formCard}>
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

          <Text style={styles.sectionTitle}>Request History</Text>
          {requests.length === 0 ? <Text style={styles.empty}>No withdrawal requests yet.</Text> : null}

          {requests.map((item) => (
            <View key={String(item.id)} style={styles.row}>
              <Text style={styles.amount}>N{Number(item.amount || 0).toLocaleString()}</Text>
              <Text style={styles.meta}>{item.status}</Text>
              <Text style={styles.meta}>{new Date(item.created_at).toLocaleDateString()}</Text>
              {item.reason_for_rejection ? (
                <Text style={styles.reject}>Reason: {item.reason_for_rejection}</Text>
              ) : null}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 4, marginBottom: 12, color: '#64748b' },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  summaryText: { color: '#1e3a8a', marginBottom: 4 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 16, fontWeight: '700', color: '#0f172a' },
  empty: { color: '#64748b' },
  row: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 },
  amount: { fontWeight: '800', color: '#0f172a' },
  meta: { marginTop: 4, color: '#64748b' },
  reject: { marginTop: 6, color: '#b91c1c' },
  warningCard: { borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb', borderRadius: 12, padding: 12 },
  warningTitle: { color: '#92400e', fontWeight: '700' },
  warningText: { color: '#b45309', marginTop: 4 },
});

export default AgentWithdrawalsScreen;
