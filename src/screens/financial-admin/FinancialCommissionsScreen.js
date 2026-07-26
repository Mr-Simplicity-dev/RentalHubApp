import React, { useCallback, useEffect, useState } from 'react';
import {StyleSheet, View} from 'react-native';
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
import { getErrorMessage, pickObject } from '../../utils/http';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const getStatusColor = (status) => {
  if (status === 'paid' || status === 'completed' || status === 'approved') return colors.success;
  if (status === 'failed' || status === 'rejected') return colors.danger;
  return colors.warning;
};

const FinancialCommissionsScreen = () => {
  const [commissions, setCommissions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadCommissions = useCallback(async () => {
    try {
      const response = await financialAdminService.getCommissionReports();
      const report = pickObject(response, ['data']) || {};
      setCommissions(Array.isArray(report.summary) ? report.summary : []);
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

  const header = (
    <PremiumHero
      eyebrow="Financial admin"
      title="Commission reports"
      subtitle="Track agent payouts, property-linked commissions and payment status in one clean mobile view."
      icon="ribbon-outline"
      right={<StatusPill label={`${commissions.length} groups`} color={colors.blue} />}
    />
  );

  return (
    <PremiumListScreen
      data={commissions}
      keyExtractor={(item, index) => `${item.source || 'commission'}-${item.status || 'unknown'}-${index}`}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadCommissions();
      }}
      header={header}
      emptyTitle="No commission records"
      emptyMessage="Commission activity will appear here once agents start earning from property work."
      emptyIcon="wallet-outline"
      renderItem={({ item }) => {
        const status = item.status || 'pending';
        return (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View style={styles.agentBlock}>
                <AppText style={styles.agent}>
                  {String(item.source || 'Commission').replace(/_/g, ' ')}
                </AppText>
                <AppText style={styles.property}>
                  {Number(item.transaction_count || 0).toLocaleString()} transactions
                </AppText>
              </View>
              <StatusPill label={status} color={getStatusColor(status)} />
            </View>

            <AppText style={styles.amount}>{formatNaira(item.total_amount || 0)}</AppText>

            <InfoRow
              icon="stats-chart-outline"
              label="Average rate"
              value={`${Number(item.avg_rate || 0).toFixed(2)}%`}
            />
          </PremiumCard>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  agentBlock: {
    flex: 1,
  },
  agent: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  property: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  amount: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 24,
    marginBottom: 6,
    marginTop: 14,
  },
});

export default FinancialCommissionsScreen;
