import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { financialAdminService } from '../../services/financialAdminService';
import { getErrorMessage, pickList } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const FinancialCommissionsScreen = () => {
  const [commissions, setCommissions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadCommissions = useCallback(async () => {
    try {
      const response = await financialAdminService.getCommissionReports();
      setCommissions(pickList(response, ['data', 'commissions']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load commissions'),
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={commissions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCommissions(); }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardAgent}>{item.agent_name || item.agent?.name || 'Agent'}</Text>
              <Text style={[styles.cardStatus, item.status === 'paid' && styles.paid]}>
                {item.status || 'pending'}
              </Text>
            </View>
            <Text style={styles.cardAmount}>{formatCurrency(item.amount || 0)}</Text>
            <Text style={styles.cardMeta}>
              {item.property_title || item.property?.title || 'Property'} |
              {item.created_at ? ` ${new Date(item.created_at).toLocaleDateString()}` : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No commission records found.</Text>}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAgent: { fontWeight: '700', color: '#0f172a', fontSize: 15 },
  cardStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    textTransform: 'capitalize',
  },
  paid: { color: '#059669' },
  cardAmount: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 6 },
  cardMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});

export default FinancialCommissionsScreen;
