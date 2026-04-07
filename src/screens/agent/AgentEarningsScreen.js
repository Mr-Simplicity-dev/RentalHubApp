import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import { agentService } from '../../services/agentService';
import { getErrorMessage, pickList } from '../../utils/http';

const AgentEarningsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(null);
  const [history, setHistory] = useState([]);

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

  const amount = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Commission Ledger</Text>

      <View style={styles.row}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Earned</Text>
          <Text style={styles.statValue}>{amount(earnings?.total_earned)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Paid</Text>
          <Text style={styles.statValue}>{amount(earnings?.total_paid)}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statValue}>{amount(earnings?.total_pending)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Transactions</Text>
          <Text style={styles.statValue}>{Number(earnings?.transaction_count || 0)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('AgentWithdrawals')}
      >
        <Text style={styles.primaryBtnText}>Request Withdrawal</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent Ledger Entries</Text>
      {loading ? <Text style={styles.muted}>Loading...</Text> : null}

      {!loading && history.length === 0 ? <Text style={styles.muted}>No commission entries yet.</Text> : null}

      {history.map((entry) => (
        <View key={entry.id} style={styles.entryCard}>
          <Text style={styles.entryType}>{entry.transaction_type}</Text>
          <Text style={styles.entryAmount}>{amount(entry.amount)}</Text>
          <Text style={styles.entryMeta}>
            {entry.status} | {entry.payment_status}
          </Text>
          <Text style={styles.entryMeta}>
            {entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  statLabel: { color: '#64748b' },
  statValue: { marginTop: 6, fontWeight: '800', color: '#0f172a' },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700' },
  muted: { color: '#64748b' },
  entryCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  entryType: { fontWeight: '700', color: '#0f172a' },
  entryAmount: { marginTop: 4, fontWeight: '800', color: '#0284c7' },
  entryMeta: { marginTop: 4, color: '#64748b', fontSize: 12 },
});

export default AgentEarningsScreen;
