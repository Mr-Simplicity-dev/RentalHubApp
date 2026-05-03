import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { rentSavingsService } from '../../services/rentSavingsService';
import Button from '../../components/common/Button';
import { getErrorMessage, pickObject } from '../../utils/http';

const formatCurrency = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

const RentSavingsDashboardScreen = ({ navigation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await rentSavingsService.getDashboard();
      setDashboard(pickObject(response, ['data', 'dashboard']) || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load savings dashboard'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const totalSaved = dashboard?.total_saved ?? dashboard?.totalSavings ?? 0;
  const totalGoals = dashboard?.total_goals ?? dashboard?.totalGoals ?? 0;
  const activeGoals = dashboard?.active_goals ?? dashboard?.activeGoals ?? 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Rent Savings</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Saved</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalSaved)}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{totalGoals}</Text>
            <Text style={styles.summaryItemLabel}>Total Goals</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemValue}>{activeGoals}</Text>
            <Text style={styles.summaryItemLabel}>Active Goals</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SavingsGoalCreate')}
        >
          <Icon name="add-circle-outline" size={32} color="#0284c7" />
          <Text style={styles.actionText}>Create Goal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SavingsGoalList')}
        >
          <Icon name="list-outline" size={32} color="#0284c7" />
          <Text style={styles.actionText}>My Goals</Text>
        </TouchableOpacity>
      </View>

      {dashboard?.recent_goals?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Goals</Text>
          {dashboard.recent_goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={styles.goalCard}
              onPress={() => navigation.navigate('SavingsGoalDetail', { goalId: goal.id })}
            >
              <View style={styles.goalHeader}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalStatus}>{goal.status}</Text>
              </View>
              <Text style={styles.goalTarget}>{formatCurrency(goal.target_amount)}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(goal.progress_percentage || 0, 100)}%` }]} />
              </View>
              <Text style={styles.goalProgress}>
                {formatCurrency(goal.saved_amount || 0)} saved ({Math.round(goal.progress_percentage || 0)}%)
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  summaryCard: {
    backgroundColor: '#0284c7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryLabel: { color: '#bae6fd', fontSize: 14, fontWeight: '500' },
  summaryValue: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  summaryRow: { flexDirection: 'row', marginTop: 16, gap: 16 },
  summaryItem: { flex: 1, backgroundColor: '#0369a1', borderRadius: 10, padding: 12 },
  summaryItemValue: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  summaryItemLabel: { color: '#bae6fd', fontSize: 12, marginTop: 2 },
  actionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionText: { color: '#0f172a', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  goalCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  goalStatus: { fontSize: 12, fontWeight: '600', color: '#0284c7', textTransform: 'capitalize' },
  goalTarget: { fontSize: 22, fontWeight: '800', color: '#0284c7', marginTop: 6 },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#0284c7', borderRadius: 4 },
  goalProgress: { color: '#475569', fontSize: 13, marginTop: 4 },
});

export default RentSavingsDashboardScreen;
