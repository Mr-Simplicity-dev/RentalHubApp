import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { colors, typography } from '../../theme';

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

  const header = (
    <PremiumHero
      eyebrow="Financial admin"
      title="Commission reports"
      subtitle="Track agent payouts, property-linked commissions and payment status in one clean mobile view."
      icon="ribbon-outline"
    />
  );

  return (
    <PremiumListScreen
      data={commissions}
      keyExtractor={(item) => String(item.id)}
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
                <Text style={styles.agent}>{item.agent_name || item.agent?.name || 'Agent'}</Text>
                <Text style={styles.property}>{item.property_title || item.property?.title || 'Property'}</Text>
              </View>
              <StatusPill label={status} color={getStatusColor(status)} />
            </View>

            <Text style={styles.amount}>{formatNaira(item.amount || 0)}</Text>

            <InfoRow
              icon="calendar-outline"
              label="Created"
              value={item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Not available'}
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
    fontSize: 12,
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
