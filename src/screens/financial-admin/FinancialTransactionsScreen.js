import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';

const filters = ['all', 'pending', 'completed', 'failed'];

const getStatusColor = (status) => {
  if (status === 'completed' || status === 'success') return colors.success;
  if (status === 'failed' || status === 'cancelled') return colors.danger;
  return colors.warning;
};

const FinancialTransactionsScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

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
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const header = (
    <>
      <PremiumHero
        eyebrow="Financial admin"
        title="Transaction ledger"
        subtitle="Search the pulse of RentalHub payments by status with clean native ledger cards."
        icon="receipt-outline"
      />
      <View style={styles.filterRow}>
        {filters.map((item) => (
          <TouchableOpacity
            key={item}
            accessibilityRole="button"
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <PremiumListScreen
      data={transactions}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadTransactions();
      }}
      header={header}
      emptyTitle="No transactions found"
      emptyMessage="Try another status filter or refresh when new payments come in."
      emptyIcon="receipt-outline"
      renderItem={({ item }) => {
        const status = item.status || item.payment_status || 'pending';
        return (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View style={styles.refBlock}>
                <Text style={styles.reference}>#{item.reference || item.id}</Text>
                <Text style={styles.amount}>{formatNaira(item.amount || 0)}</Text>
              </View>
              <StatusPill label={status} color={getStatusColor(status)} />
            </View>

            <InfoRow
              icon="card-outline"
              label="Method"
              value={item.payment_method || item.method || 'N/A'}
            />
            <InfoRow
              icon="person-outline"
              label="Customer"
              value={item.user_name || item.email || 'Not available'}
            />
            <InfoRow
              icon="calendar-outline"
              label="Date"
              value={item.created_at ? new Date(item.created_at).toLocaleString() : 'Not available'}
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
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  refBlock: {
    flex: 1,
  },
  reference: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  amount: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 23,
    marginTop: 4,
  },
});

export default FinancialTransactionsScreen;
