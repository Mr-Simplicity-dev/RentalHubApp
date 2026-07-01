import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import { getErrorMessage, pickList } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const FinancialTransactionsScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      const params = {};
      if (filter !== 'all') params.payment_status = filter;

      const response = await financialAdminService.getTransactionHistory(params);
      setTransactions(pickList(response, ['data', 'transactions']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load transactions'),
      });
    }
  };

  const filters = ['all', 'pending', 'completed', 'failed'];

  return (
    <View style={styles.screen}>
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardRef}>#{item.reference || item.id}</Text>
              <Text style={[styles.cardStatus, item.status === 'completed' && styles.comp, item.status === 'failed' && styles.fail]}>
                {item.status || 'pending'}
              </Text>
            </View>
            <Text style={styles.cardAmount}>{formatCurrency(item.amount || 0)}</Text>
            <Text style={styles.cardMeta}>
              {item.payment_method || item.method || 'N/A'} | {item.user_name || item.email || ''}
            </Text>
            <Text style={styles.cardDate}>
              {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
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
  filterRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8, flexWrap: 'wrap' },
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
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardRef: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  cardStatus: { fontSize: 11, fontWeight: '700', color: '#d97706', textTransform: 'capitalize' },
  comp: { color: '#059669' },
  fail: { color: '#dc2626' },
  cardAmount: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  cardMeta: { color: '#475569', fontSize: 13, marginTop: 2 },
  cardDate: { color: '#64748b', fontSize: 11, marginTop: 2 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});

export default FinancialTransactionsScreen;
