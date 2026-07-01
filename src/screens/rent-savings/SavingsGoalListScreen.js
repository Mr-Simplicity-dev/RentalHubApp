import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { rentSavingsService } from '../../services/rentSavingsService';
import { getErrorMessage, pickList } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const SavingsGoalListScreen = ({ navigation }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      const response = await rentSavingsService.getSavingsPlans();
      setGoals(pickList(response, ['data', 'goals']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load savings goals'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SavingsGoalDetail', { goalId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.property_title || 'Rent savings plan'}</Text>
        <Text style={[styles.cardStatus, item.status === 'active' && styles.statusActive]}>
          {item.status || 'active'}
        </Text>
      </View>
      <Text style={styles.cardTarget}>{formatCurrency(item.target_savings_amount)}</Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(
                Number(item.target_savings_amount)
                  ? (Number(item.total_saved || 0) / Number(item.target_savings_amount)) * 100
                  : 0,
                100
              )}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.cardProgress}>
        {formatCurrency(item.total_saved || 0)} saved
      </Text>
      {item.rent_due_date && (
        <Text style={styles.cardDate}>
          Due: {new Date(item.rent_due_date).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={goals}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
        ListHeaderComponent={
          <Text style={styles.title}>My Savings Plans ({goals.length})</Text>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>No savings plans yet.</Text>
              <Text style={styles.emptySub}>Create your first plan.</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  statusActive: { color: '#0284c7', backgroundColor: '#e0f2fe' },
  cardTarget: { fontSize: 22, fontWeight: '800', color: '#0284c7', marginTop: 6 },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#0284c7', borderRadius: 4 },
  cardProgress: { color: '#475569', fontSize: 13, marginTop: 4 },
  cardDate: { color: '#64748b', fontSize: 12, marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  empty: { fontSize: 16, color: '#64748b' },
  emptySub: { color: '#94a3b8', marginTop: 4 },
});

export default SavingsGoalListScreen;
