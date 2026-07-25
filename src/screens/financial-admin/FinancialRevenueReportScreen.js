import React, { useEffect, useState } from 'react';
import {StyleSheet TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  InfoRow,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
  formatNaira,
} from '../../components/common/PremiumLayout';
import { financialAdminService } from '../../services/financialAdminService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const periods = ['daily', 'weekly', 'monthly', 'yearly'];

const getStatusColor = (status) => {
  if (status === 'completed' || status === 'success') return colors.success;
  if (status === 'failed' || status === 'cancelled') return colors.danger;
  return colors.warning;
};

const FinancialRevenueReportScreen = () => {
  const [revenueData, setRevenueData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [refreshing, setRefreshing] = useState(false);

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
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const growth = revenueData?.growth_percentage;
  const header = (
    <>
      <PremiumHero
        eyebrow="Financial admin"
        title="Revenue command centre"
        subtitle="Monitor RentalHub revenue trends and the latest payment flow with a native executive summary."
        icon="analytics-outline"
      />

      <View style={styles.filterRow}>
        {periods.map((item) => (
          <TouchableOpacity
            key={item}
            accessibilityRole="button"
            style={[styles.filterChip, period === item && styles.filterChipActive]}
            onPress={() => setPeriod(item)}
          >
            <AppText style={[styles.filterText, period === item && styles.filterTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {revenueData ? (
        <View style={styles.summaryRow}>
          <PremiumCard style={styles.summaryCard}>
            <AppText style={styles.summaryLabel}>Total revenue</AppText>
            <AppText style={styles.summaryValue}>{formatNaira(revenueData.total_revenue || 0)}</AppText>
          </PremiumCard>
          <PremiumCard style={styles.summaryCard}>
            <AppText style={styles.summaryLabel}>Growth</AppText>
            <AppText style={[
              styles.summaryValue,
              { color: (growth || 0) >= 0 ? colors.success : colors.danger },
            ]}>
              {growth != null ? `${growth.toFixed(1)}%` : 'N/A'}
            </AppText>
          </PremiumCard>
        </View>
      ) : null}

      <AppText style={styles.sectionTitle}>Recent transactions</AppText>
    </>
  );

  return (
    <PremiumListScreen
      data={transactions}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}
      header={header}
      emptyTitle="No transactions found"
      emptyMessage="Revenue-linked transactions will appear here after payments are processed."
      emptyIcon="trending-up-outline"
      renderItem={({ item }) => {
        const status = item.status || item.payment_status || 'pending';
        return (
          <PremiumCard>
            <View style={styles.txHeader}>
              <View style={styles.txBlock}>
                <AppText style={styles.txRef}>#{item.reference || item.id}</AppText>
                <AppText style={styles.txAmount}>{formatNaira(item.amount || 0)}</AppText>
              </View>
              <StatusPill label={status} color={getStatusColor(status)} />
            </View>
            <InfoRow
              icon="card-outline"
              label="Method"
              value={item.payment_method || item.method || 'N/A'}
            />
            <InfoRow
              icon="calendar-outline"
              label="Date"
              value={item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Not available'}
            />
          </PremiumCard>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  filterText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  summaryCard: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 5,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    marginBottom: 10,
    marginTop: 4,
  },
  txHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  txBlock: {
    flex: 1,
  },
  txRef: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  txAmount: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 24,
    marginTop: 4,
  },
});

export default FinancialRevenueReportScreen;
