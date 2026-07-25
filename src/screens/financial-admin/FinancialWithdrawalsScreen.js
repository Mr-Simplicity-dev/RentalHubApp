import React, { useCallback, useEffect, useState } from 'react';
import {StyleSheet View} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
  formatNaira,
} from '../../components/common/PremiumLayout';
import { financialAdminService } from '../../services/financialAdminService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const getStatusColor = (status) => {
  if (status === 'approved' || status === 'paid' || status === 'completed') return colors.success;
  if (status === 'rejected' || status === 'failed') return colors.danger;
  return colors.warning;
};

const FinancialWithdrawalsScreen = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadWithdrawals = useCallback(async () => {
    try {
      const response = await financialAdminService.getWithdrawalRequests();
      setWithdrawals(pickList(response, ['data', 'withdrawals']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load withdrawal requests'),
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const processWithdrawal = async (id, action) => {
    setProcessingId(`${id}-${action}`);
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
    } finally {
      setProcessingId(null);
    }
  };

  const header = (
    <PremiumHero
      eyebrow="Financial admin"
      title="Withdrawal controls"
      subtitle="Review requested payouts with beneficiary details and quick approval actions."
      icon="cash-outline"
    />
  );

  return (
    <PremiumListScreen
      data={withdrawals}
      keyExtractor={(item) => String(item.id)}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadWithdrawals();
      }}
      header={header}
      emptyTitle="No withdrawal requests"
      emptyMessage="Pending payout requests will appear here for review."
      emptyIcon="card-outline"
      renderItem={({ item }) => {
        const status = item.status || 'pending';
        const isPending = status === 'pending';
        return (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View>
                <AppText style={styles.amount}>{formatNaira(item.amount || 0)}</AppText>
                <AppText style={styles.user}>{item.user_name || item.user?.name || 'Unknown user'}</AppText>
              </View>
              <StatusPill label={status} color={getStatusColor(status)} />
            </View>

            <InfoRow
              icon="business-outline"
              label="Bank"
              value={`${item.bank_name || 'N/A'}${item.account_number ? ` • ${item.account_number}` : ''}`}
            />
            <InfoRow
              icon="time-outline"
              label="Requested"
              value={item.created_at ? new Date(item.created_at).toLocaleString() : 'Not available'}
            />

            {isPending ? (
              <View style={styles.actions}>
                <PremiumButton
                  title="Approve"
                  onPress={() => processWithdrawal(item.id, 'approve')}
                  loading={processingId === `${item.id}-approve`}
                  icon="checkmark-outline"
                  style={styles.actionButton}
                />
                <PremiumButton
                  title="Reject"
                  variant="ghost"
                  onPress={() => processWithdrawal(item.id, 'reject')}
                  loading={processingId === `${item.id}-reject`}
                  icon="close-outline"
                  style={styles.actionButton}
                />
              </View>
            ) : null}
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
    marginBottom: 6,
  },
  amount: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 24,
  },
  user: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
  },
});

export default FinancialWithdrawalsScreen;
