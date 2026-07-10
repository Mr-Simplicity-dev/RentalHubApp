import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import { getErrorMessage, pickObject } from '../../utils/http';
import { colors } from '../../theme';
import { MetricCard, MetricGrid } from '../../components/dashboard/DashboardKit';

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const AdminLedgerScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/ledger');
      setData(pickObject(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load ledger'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const totals = data?.totals || data?.summary || {};
  const transactions = data?.transactions || data?.recent_transactions || data?.entries || [];

  const summaryCards = [
    { label: 'Total In', value: formatCurrency(totals.total_in ?? totals.totalIn ?? 0), icon: 'arrow-down-circle-outline', color: colors.success },
    { label: 'Total Out', value: formatCurrency(totals.total_out ?? totals.totalOut ?? 0), icon: 'arrow-up-circle-outline', color: colors.danger },
    { label: 'Balance', value: formatCurrency(totals.balance ?? 0), icon: 'wallet-outline', color: colors.blue },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Icon name="book-outline" size={20} color="#0f172a" />
        <Text style={styles.title}>Ledger</Text>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadLedger}
        ListHeaderComponent={
          <MetricGrid>
            {summaryCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </MetricGrid>
        }
        renderItem={({ item }) => {
          const type = item.type || item.entry_type || 'debit';
          const isCredit = type === 'credit' || type === 'in';
          return (
            <View style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.description || item.narration || 'Transaction'}</Text>
                <Text style={styles.rowMeta}>{item.date || item.created_at || 'N/A'}</Text>
              </View>
              <View style={styles.amountCol}>
                <Text style={[styles.amount, { color: isCredit ? colors.success : colors.danger }]}>
                  {formatCurrency(item.amount ?? 0)}
                </Text>
                <Text style={[styles.typeBadge, { color: isCredit ? colors.success : colors.danger }]}>
                  {isCredit ? 'credit' : 'debit'}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No transactions found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  row: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowMeta: { marginTop: 3, color: '#475569', fontSize: 12 },
  amountCol: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '800' },
  typeBadge: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});

export default AdminLedgerScreen;
