import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  StatusPill,
} from '../../components/common/PremiumLayout';
import WithdrawalFactorModal from '../../components/dashboard/WithdrawalFactorModal';
import { stateAdminService } from '../../services/stateAdminService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const formatNaira = (value) => `₦${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const TAB = [
  { key: 'summary', label: 'Commissions' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'withdrawals', label: 'Withdrawals' },
  { key: 'withdraw', label: 'Request' },
];

const STATUS_COLORS = {
  pending: colors.blue,
  approved: colors.success,
  paid: colors.success,
  rejected: colors.danger,
  completed: colors.success,
};

const StateAdminFinanceScreen = () => {
  const [tab, setTab] = useState('summary');
  const [commissions, setCommissions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState(null); // { method }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [commissionsRes, transactionsRes, withdrawalsRes] = await Promise.all([
        stateAdminService.getCommissionsSummary(),
        stateAdminService.getTransactions({ limit: 50 }),
        stateAdminService.getWithdrawals(),
      ]);
      setCommissions(Array.isArray(commissionsRes?.data) ? commissionsRes.data : []);
      const txnData = pickObject(transactionsRes, ['data']);
      setTransactions(pickList(txnData, ['recent_transactions']));
      const wdData = pickObject(withdrawalsRes, ['data']);
      setWithdrawals(pickList(wdData, ['withdrawals']));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not load finance data'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const setField = (key) => (value) =>
    setWithdrawForm((prev) => ({ ...prev, [key]: value }));

  const submitWithdraw = async (extra = {}) => {
    const { amount, bank_name, account_number, account_name } = withdrawForm;
    if (!amount || !bank_name || !account_number || !account_name) {
      setError('All fields are required.');
      return;
    }
    if (String(account_number).length !== 10) {
      setError('Account number must be 10 digits.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const body = {
        amount: Number(amount),
        bank_name,
        account_number,
        account_name,
        ...extra,
      };
      const response = await stateAdminService.requestWithdrawal(body);
      if (response?.success) {
        Toast.show({ type: 'success', text1: 'Withdrawal requested' });
        setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
        await load();
      } else {
        setError(response?.message || 'Could not submit the request.');
      }
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 428 && code === 'OTP_REQUIRED') {
        setFactor({ method: err.response.data.method === 'totp' ? 'totp' : 'sms' });
      } else {
        setError(getErrorMessage(err, 'Could not submit the request.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const verifyFactor = async (code) => {
    const extra = factor?.method === 'totp' ? { totp_code: code } : { otp: code };
    await submitWithdraw(extra);
    setFactor(null);
  };

  if (loading) {
    return <PremiumCenter loading title="Loading finance" />;
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PremiumHero
          eyebrow="State finance"
          title="Commissions & withdrawals"
          subtitle="Review commission earnings, state transactions and payout requests."
          icon="wallet-outline"
        />

        <View style={styles.tabRow}>
          {TAB.map((t) => {
            const activeTab = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.85}
                onPress={() => setTab(t.key)}
                style={[styles.tab, activeTab && styles.tabActive]}
              >
                <AppText style={[styles.tabText, activeTab && styles.tabTextActive]}>
                  {t.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'summary' ? (
          <PremiumCard>
            {commissions.length === 0 ? (
              <AppText style={styles.empty}>No commission records yet.</AppText>
            ) : (
              commissions.map((row, index) => {
                const color = STATUS_COLORS[row.status] || colors.blue;
                return (
                  <View key={`${row.date}-${row.source}-${index}`} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.rowTitle}>{String(row.source || '—').replace(/_/g, ' ')}</AppText>
                      <AppText style={styles.rowMeta}>
                        {formatDate(row.date)} · {row.transaction_count} txns
                      </AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <AppText style={styles.rowAmount}>{formatNaira(row.total_amount)}</AppText>
                      <StatusPill label={row.status} color={color} />
                    </View>
                  </View>
                );
              })
            )}
          </PremiumCard>
        ) : null}

        {tab === 'transactions' ? (
          <PremiumCard>
            {transactions.length === 0 ? (
              <AppText style={styles.empty}>No transactions in your state yet.</AppText>
            ) : (
              transactions.map((txn, index) => (
                <View key={`${txn.id}-${index}`} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.rowTitle}>
                      {txn.property_title || txn.user_name || String(txn.payment_type || 'Payment').replace(/_/g, ' ')}
                    </AppText>
                    <AppText style={styles.rowMeta}>
                      {txn.user_name ? `${txn.user_name} · ` : ''}
                      {txn.payment_type} · {formatDate(txn.created_at || txn.completed_at)}
                    </AppText>
                  </View>
                  <AppText style={styles.rowAmount}>{formatNaira(txn.amount)}</AppText>
                </View>
              ))
            )}
          </PremiumCard>
        ) : null}

        {tab === 'withdrawals' ? (
          <PremiumCard>
            {withdrawals.length === 0 ? (
              <AppText style={styles.empty}>No withdrawal requests yet.</AppText>
            ) : (
              withdrawals.map((item, index) => {
                const color = STATUS_COLORS[item.status] || colors.blue;
                return (
                  <View key={`${item.requested_at}-${index}`} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.rowTitle}>{item.bank_name} · {item.account_number}</AppText>
                      <AppText style={styles.rowMeta}>{formatDate(item.requested_at)}</AppText>
                      {item.admin_note ? <AppText style={styles.rowMeta}>Note: {item.admin_note}</AppText> : null}
                      {item.payout_failed_reason ? (
                        <AppText style={styles.rowMetaDanger}>{item.payout_failed_reason}</AppText>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <AppText style={styles.rowAmount}>{formatNaira(item.amount)}</AppText>
                      <StatusPill label={item.status} color={color} />
                    </View>
                  </View>
                );
              })
            )}
          </PremiumCard>
        ) : null}

        {tab === 'withdraw' ? (
          <PremiumCard>
            <Input
              label="Amount (₦)"
              value={withdrawForm.amount}
              onChangeText={setField('amount')}
              placeholder="Minimum ₦1,000"
              keyboardType="numeric"
            />
            <Input
              label="Bank name"
              value={withdrawForm.bank_name}
              onChangeText={setField('bank_name')}
              placeholder="e.g. Access Bank"
              containerStyle={styles.fieldGap}
            />
            <Input
              label="Account number"
              value={withdrawForm.account_number}
              onChangeText={setField('account_number')}
              placeholder="10-digit account number"
              keyboardType="number-pad"
              maxLength={10}
              containerStyle={styles.fieldGap}
            />
            <Input
              label="Account name"
              value={withdrawForm.account_name}
              onChangeText={setField('account_name')}
              placeholder="Exact name on the account"
              containerStyle={styles.fieldGap}
            />

            {error ? <AppText style={styles.error}>{error}</AppText> : null}

            <PremiumButton
              title="Request withdrawal"
              onPress={() => submitWithdraw()}
              loading={submitting}
              icon="paper-plane-outline"
              style={styles.submit}
            />
            <AppText style={styles.hint}>
              Two-factor verification (authenticator or SMS code) is required to request a payout.
            </AppText>
          </PremiumCard>
        ) : null}

        {tab === 'summary' || tab === 'transactions' ? (
          <InfoRow icon="shield-checkmark-outline" label="Scope" value="Your assigned state only" />
        ) : null}
      </ScrollView>

      {factor ? (
        <WithdrawalFactorModal
          method={factor.method}
          onVerified={verifyFactor}
          onCancel={() => setFactor(null)}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  tabActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  tabText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  listRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  rowTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  rowMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  rowMetaDanger: {
    color: colors.danger,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  rowAmount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  empty: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  fieldGap: {
    marginTop: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 10,
  },
  submit: {
    marginTop: 16,
  },
  hint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 10,
  },
});

export default StateAdminFinanceScreen;
