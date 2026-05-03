import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const FinancialRevenueReportScreen = () => {
  const [revenueData, setRevenueData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      const revResponse = await financialAdminService.getRevenueStatistics({ period });
      setRevenueData(pickObject(revResponse, ['data', 'revenue']));

      const txResponse = await financialAdminService.getTransactionHistory({ limit: 20 });
      setTransactions(pickList(txResponse, ['data', 'transactions']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load revenue data'),
      });
    }
  };

  const periods = ['daily', 'weekly', 'monthly', 'yearly'];

  return (
    <View style={styles.screen}>
      <View style={styles.filterRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.filterChip, period === p && styles.filterChipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {revenueData && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>{formatCurrency(revenueData.total_revenue || 0)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Growth</Text>
            <Text style={[styles.summaryValue, { color: (revenueData.growth_percentage || 0) >= 0 ? '#059669' : '#dc2626' }]}>
              {revenueData.growth_percentage != null ? `${revenueData.growth_percentage.toFixed(1)}%` : 'N/A'}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={styles.txHeader}>
              <Text style={styles.txRef}>#{item.reference || item.id}</Text>
              <Text style={[styles.txStatus, item.status === 'completed' && styles.statusCompleted]}>
                {item.status || 'pending'}
              </Text>
            </View>
            <Text style={styles.txAmount}>{formatCurrency(item.amount || 0)}</Text>
            <Text style={styles.txMeta}>
              {item.payment_method || item.method} | {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No transactions found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  filterText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: { color: '#64748b', fontSize: 12 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  txCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  txRef: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  txStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    textTransform: 'capitalize',
  },
  statusCompleted: { color: '#059669' },
  txAmount: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  txMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});

export default FinancialRevenueReportScreen;
