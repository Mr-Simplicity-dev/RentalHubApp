import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import { getErrorMessage, pickList } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const FinancialWithdrawalsScreen = () => {
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      const response = await financialAdminService.getWithdrawalRequests();
      setWithdrawals(pickList(response, ['data', 'withdrawals']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load withdrawal requests'),
      });
    }
  };

  const processWithdrawal = async (id, action) => {
    try {
      await financialAdminService.processWithdrawal(id, { status: action });
      Toast.show({ type: 'success', text1: `Withdrawal ${action}ed` });
      loadWithdrawals();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, `Could not ${action} withdrawal`),
      });
    }
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={withdrawals}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardAmount}>{formatCurrency(item.amount || 0)}</Text>
            <Text style={styles.cardUser}>{item.user_name || item.user?.name || 'Unknown'}</Text>
            <Text style={styles.cardMeta}>Bank: {item.bank_name || 'N/A'} | {item.account_number || ''}</Text>
            <Text style={styles.cardMeta}>Status: {item.status || 'pending'}</Text>
            {item.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => processWithdrawal(item.id, 'approve')}>
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => processWithdrawal(item.id, 'reject')}>
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No withdrawal requests.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardAmount: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  cardUser: { color: '#475569', fontSize: 14, marginTop: 2 },
  cardMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  approveText: { color: '#059669', fontWeight: '700' },
  rejectText: { color: '#dc2626', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});

export default FinancialWithdrawalsScreen;
