import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { AuthContext } from '../../context/AuthContext';
import AdminAccountActions from '../../components/admin/AdminAccountActions';
import Input from '../../components/common/Input';
import OptionPickerModal from '../../components/common/OptionPickerModal';
import SelectField from '../../components/common/SelectField';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  StatusPill,
} from '../../components/common/PremiumLayout';
import {
  ActionRow,
  DashboardHero,
  DashboardNotice,
  DashboardScreen,
  DashboardSection,
  MetricCard,
  MetricGrid,
} from '../../components/dashboard/DashboardKit';
import { financialAdminService } from '../../services/financialAdminService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const EMPTY_FORM = {
  amount: '',
  bank_name: '',
  bank_code: '',
  account_number: '',
  account_name: '',
};

const FALLBACK_BANKS = [
  'Access Bank',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'Guaranty Trust Bank',
  'Stanbic IBTC Bank',
  'Sterling Bank',
  'United Bank for Africa',
  'Union Bank of Nigeria',
  'Wema Bank',
  'Zenith Bank',
];

const formatCurrency = (value, fallback = '₦0') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return `₦${numeric.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['approved', 'paid', 'completed'].includes(normalized)) return colors.success;
  if (['rejected', 'failed', 'cancelled'].includes(normalized)) return colors.danger;
  return colors.warning;
};

const normalizeBanks = (rows) =>
  rows
    .map((bank) => {
      if (typeof bank === 'string') {
        return { label: bank, value: bank, name: bank, code: '' };
      }

      const name = String(bank?.name || bank?.bank_name || bank?.label || '').trim();
      const code = String(bank?.code || bank?.bank_code || '').trim();
      if (!name) return null;
      return {
        label: name,
        value: code || name,
        name,
        code,
      };
    })
    .filter(Boolean);

const maskAccountNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Not provided';
  return `••••••${digits.slice(-4)}`;
};

const WithdrawalRequestModal = ({
  visible,
  withdrawable,
  onClose,
  onSubmitted,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankWarning, setBankWarning] = useState('');
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [accountVerified, setAccountVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadBanks = useCallback(async () => {
    setBanksLoading(true);
    setBankWarning('');
    try {
      const response = await financialAdminService.getWithdrawalBanks();
      const rows = pickList(response, ['data', 'banks']);
      const normalized = normalizeBanks(rows);
      if (!normalized.length) throw new Error('No banks were returned');
      setBanks(normalized);
    } catch (error) {
      setBanks(normalizeBanks(FALLBACK_BANKS));
      setBankWarning('The live bank list is unavailable. Select a bank below and verify the account before submitting.');
    } finally {
      setBanksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setVerificationMessage('');
    setAccountVerified(false);
    loadBanks();
  }, [loadBanks, visible]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const selectBank = (bank) => {
    setForm((current) => ({
      ...current,
      bank_name: bank.name,
      bank_code: bank.code,
      account_name: '',
    }));
    setErrors((current) => ({ ...current, bank_name: undefined }));
    setVerificationMessage('');
    setAccountVerified(false);
  };

  const updateAccountNumber = (value) => {
    const accountNumber = String(value || '').replace(/\D/g, '').slice(0, 10);
    setForm((current) => ({
      ...current,
      account_number: accountNumber,
      account_name: '',
    }));
    setErrors((current) => ({
      ...current,
      account_number: undefined,
      account_name: undefined,
    }));
    setVerificationMessage('');
    setAccountVerified(false);
  };

  const verifyAccount = async () => {
    const nextErrors = {};
    if (!form.bank_name.trim()) nextErrors.bank_name = 'Select a bank first.';
    if (!/^\d{10}$/.test(form.account_number)) {
      nextErrors.account_number = 'Account number must contain exactly 10 digits.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }

    setVerifying(true);
    setVerificationMessage('');
    try {
      const response = await financialAdminService.verifyWithdrawalAccount({
        bankCode: form.bank_code,
        bankName: form.bank_name,
        accountNumber: form.account_number,
      });
      const account = pickObject(response, ['data', 'account']);
      const accountName = String(account?.account_name || '').trim();
      if (!accountName) throw new Error('The bank did not return an account name.');

      setForm((current) => ({
        ...current,
        bank_name: account?.bank_name || current.bank_name,
        bank_code: account?.bank_code || current.bank_code,
        account_name: accountName,
      }));
      setErrors((current) => ({ ...current, account_name: undefined }));
      setAccountVerified(true);
      setVerificationMessage(`Verified account: ${accountName}`);
    } catch (error) {
      setAccountVerified(false);
      setVerificationMessage(
        `${getErrorMessage(error, 'Could not verify this account.')} Check the details or enter the account name manually.`
      );
    } finally {
      setVerifying(false);
    }
  };

  const validate = () => {
    const nextErrors = {};
    const amount = Number(String(form.amount || '').replace(/,/g, '').trim());
    const available = Number(withdrawable);

    if (!Number.isFinite(amount) || amount < 1000) {
      nextErrors.amount = 'The minimum withdrawal amount is ₦1,000.';
    } else if (Number.isFinite(available) && amount > available) {
      nextErrors.amount = `Amount exceeds your ${formatCurrency(available)} withdrawable balance.`;
    }
    if (!form.bank_name.trim()) nextErrors.bank_name = 'Select a bank.';
    if (!/^\d{10}$/.test(form.account_number)) {
      nextErrors.account_number = 'Account number must contain exactly 10 digits.';
    }
    if (form.account_name.trim().length < 2) {
      nextErrors.account_name = 'Enter the account holder name.';
    }

    setErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, amount };
  };

  const submit = async () => {
    const { valid, amount } = validate();
    if (!valid) {
      Toast.show({
        type: 'error',
        text1: 'Check withdrawal details',
        text2: 'Correct the highlighted fields before submitting.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await financialAdminService.requestPersonalWithdrawal({
        amount,
        bankName: form.bank_name.trim(),
        bankCode: form.bank_code.trim(),
        accountNumber: form.account_number,
        accountName: form.account_name.trim(),
      });
      Toast.show({
        type: 'success',
        text1: 'Withdrawal requested',
        text2: response?.message || 'Your commission withdrawal request was submitted.',
      });
      onClose();
      await onSubmitted();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Withdrawal not submitted',
        text2: getErrorMessage(error, 'Could not submit the withdrawal request.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBankValue = form.bank_code || form.bank_name;

  return (
    <>
      <Modal
        animationType="slide"
        onRequestClose={submitting ? undefined : onClose}
        transparent
        visible={visible}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <View style={styles.modalIcon}>
                  <Icon name="cash-outline" size={20} color={colors.blue} />
                </View>
                <View style={styles.modalTitleCopy}>
                  <Text style={styles.modalTitle}>Request withdrawal</Text>
                  <Text style={styles.modalSubtitle}>Personal admin commission payout</Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close withdrawal form"
                accessibilityRole="button"
                disabled={submitting}
                onPress={onClose}
                style={styles.closeButton}
              >
                <Icon name="close-outline" size={22} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.balancePanel}>
                <Text style={styles.balanceLabel}>Available to withdraw</Text>
                <Text style={styles.balanceValue}>{formatCurrency(withdrawable)}</Text>
                <Text style={styles.balanceHint}>Minimum request: ₦1,000</Text>
              </View>

              <Input
                accessibilityLabel="Withdrawal amount in naira"
                error={errors.amount}
                icon="wallet-outline"
                keyboardType="decimal-pad"
                label="Amount (NGN)"
                onChangeText={(value) => updateField('amount', value.replace(/[^\d.]/g, ''))}
                placeholder="Minimum ₦1,000"
                value={form.amount}
              />

              <SelectField
                disabled={banksLoading}
                helperText={bankWarning || errors.bank_name}
                label="Bank"
                onPress={() => setBankPickerVisible(true)}
                placeholder={banksLoading ? 'Loading Nigerian banks…' : 'Select bank'}
                value={form.bank_name}
              />

              <Input
                error={errors.account_number}
                icon="card-outline"
                keyboardType="number-pad"
                label="Account number"
                maxLength={10}
                onChangeText={updateAccountNumber}
                placeholder="10-digit account number"
                value={form.account_number}
              />

              <PremiumButton
                disabled={!form.bank_name || form.account_number.length !== 10}
                icon="shield-checkmark-outline"
                loading={verifying}
                onPress={verifyAccount}
                style={styles.verifyButton}
                title="Verify bank account"
                variant="secondary"
              />

              {verificationMessage ? (
                <View style={[
                  styles.verificationNotice,
                  accountVerified ? styles.verificationSuccess : styles.verificationWarning,
                ]}>
                  <Icon
                    name={accountVerified ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                    size={18}
                    color={accountVerified ? colors.success : '#A66B00'}
                  />
                  <Text style={[
                    styles.verificationText,
                    accountVerified ? styles.verificationTextSuccess : styles.verificationTextWarning,
                  ]}>
                    {verificationMessage}
                  </Text>
                </View>
              ) : null}

              <Input
                autoCapitalize="words"
                error={errors.account_name}
                icon="person-outline"
                label="Account name"
                onChangeText={(value) => {
                  updateField('account_name', value);
                  setAccountVerified(false);
                }}
                placeholder="Account holder name"
                value={form.account_name}
              />

              <View style={styles.modalActions}>
                <PremiumButton
                  disabled={submitting}
                  onPress={onClose}
                  style={styles.modalAction}
                  title="Cancel"
                  variant="secondary"
                />
                <PremiumButton
                  icon="send-outline"
                  loading={submitting}
                  onPress={submit}
                  style={styles.modalAction}
                  title="Submit request"
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <OptionPickerModal
        emptyText="No banks are available right now."
        onClose={() => setBankPickerVisible(false)}
        onSelect={selectBank}
        options={banks}
        searchable
        searchPlaceholder="Search Nigerian banks"
        selectedValue={selectedBankValue}
        title="Select bank"
        visible={bankPickerVisible}
      />
    </>
  );
};

const LgaFinancialAdminDashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [snapshot, setSnapshot] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    const [snapshotResult, historyResult] = await Promise.allSettled([
      financialAdminService.getPersonalWithdrawable(),
      financialAdminService.getPersonalWithdrawalHistory(),
    ]);

    const failureMessages = [];
    if (snapshotResult.status === 'fulfilled') {
      setSnapshot(pickObject(snapshotResult.value, ['data', 'snapshot']) || {});
    } else {
      failureMessages.push(
        getErrorMessage(snapshotResult.reason, 'Could not load your commission balance.')
      );
    }

    if (historyResult.status === 'fulfilled') {
      setWithdrawals(pickList(historyResult.value, ['data', 'withdrawals', 'history']));
    } else {
      failureMessages.push(
        getErrorMessage(historyResult.reason, 'Could not load your withdrawal history.')
      );
    }

    if (failureMessages.length) {
      const message = failureMessages.join(' ');
      setLoadError(message);
      Toast.show({ type: 'error', text1: 'Some finance data did not load', text2: message });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const assignedState =
    user?.assigned_state_name ||
    user?.state_name ||
    (typeof user?.assigned_state === 'string' ? user.assigned_state : '');
  const assignedLga =
    user?.assigned_city ||
    user?.assigned_lga_name ||
    user?.lga_name ||
    user?.preferred_lga_name ||
    '';
  const jurisdiction = useMemo(() => {
    if (assignedState && assignedLga) return `${assignedLga} LGA, ${assignedState}`;
    if (assignedLga) return `${assignedLga} LGA`;
    if (assignedState) return assignedState;
    return 'No assigned LGA is configured for this account.';
  }, [assignedLga, assignedState]);

  const withdrawable = Number(snapshot?.withdrawable_amount || 0);
  const totalEarned = Number(snapshot?.total_earned || 0);
  const pendingCount = withdrawals.filter(
    (item) => String(item?.status || 'pending').toLowerCase() === 'pending'
  ).length;
  const totalRequested = withdrawals.reduce(
    (sum, item) => sum + Number(item?.amount || 0),
    0
  );

  return (
    <DashboardScreen refreshing={loading} onRefresh={loadFinanceData}>
      <DashboardHero
        eyebrow="LGA FINANCE"
        icon="wallet-outline"
        onRefresh={loadFinanceData}
        subtitle="Monitor your personal admin commissions and request secure payouts without leaving the app."
        title="Finance workspace"
      />
      <AdminAccountActions navigation={navigation} />

      <DashboardNotice
        title="Assigned jurisdiction"
        message={jurisdiction}
        variant={assignedLga || assignedState ? 'info' : 'warning'}
      />

      {loadError ? (
        <View style={styles.noticeSpacing}>
          <DashboardNotice
            message={`${loadError} Pull down or use the refresh icon to try again.`}
            title="Partial data shown"
            variant="warning"
          />
        </View>
      ) : null}

      <View style={styles.metricsSpacing}>
        <MetricGrid>
          <MetricCard
            color={colors.success}
            icon="wallet-outline"
            label="Withdrawable"
            value={formatCurrency(withdrawable)}
          />
          <MetricCard
            color={colors.blue}
            icon="trending-up-outline"
            label="Total earned"
            value={formatCurrency(totalEarned)}
          />
          <MetricCard
            color={colors.navy}
            icon="receipt-outline"
            label="Requests"
            value={String(withdrawals.length)}
          />
          <MetricCard
            color={colors.warning}
            icon="time-outline"
            label="Pending"
            value={String(pendingCount)}
          />
        </MetricGrid>
      </View>

      <DashboardSection
        subtitle="Requests are reviewed through the financial approval workflow."
        title="Commission withdrawal"
      >
        <ActionRow
          badge={withdrawable >= 1000 ? 'Available' : 'Below minimum'}
          icon="cash-outline"
          onPress={() => setWithdrawalModalVisible(true)}
          subtitle={`Current withdrawable balance: ${formatCurrency(withdrawable)}`}
          title="Request personal withdrawal"
        />
      </DashboardSection>

      <DashboardSection
        subtitle={`Total requested: ${formatCurrency(totalRequested)}`}
        title="Withdrawal history"
      >
        {withdrawals.length === 0 ? (
          <PremiumCard style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="receipt-outline" size={23} color={colors.blue} />
            </View>
            <Text style={styles.emptyTitle}>No withdrawal requests yet</Text>
            <Text style={styles.emptyMessage}>
              Your personal commission payout requests will appear here.
            </Text>
          </PremiumCard>
        ) : (
          withdrawals.map((withdrawal, index) => {
            const status = String(withdrawal?.status || 'pending').toLowerCase();
            return (
              <PremiumCard
                key={String(withdrawal?.id || `${withdrawal?.requested_at || 'request'}-${index}`)}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.historyAmountWrap}>
                    <Text style={styles.historyLabel}>Requested amount</Text>
                    <Text style={styles.historyAmount}>{formatCurrency(withdrawal?.amount)}</Text>
                  </View>
                  <StatusPill label={status} color={getStatusColor(status)} />
                </View>
                <InfoRow
                  icon="business-outline"
                  label="Bank account"
                  value={`${withdrawal?.bank_name || 'Bank not available'} · ${maskAccountNumber(withdrawal?.account_number)}`}
                />
                <InfoRow
                  icon="person-outline"
                  label="Account name"
                  value={withdrawal?.account_name || 'Not available'}
                />
                <InfoRow
                  icon="calendar-outline"
                  label="Requested"
                  value={formatDate(withdrawal?.requested_at || withdrawal?.created_at)}
                />
              </PremiumCard>
            );
          })
        )}
      </DashboardSection>

      <WithdrawalRequestModal
        onClose={() => setWithdrawalModalVisible(false)}
        onSubmitted={loadFinanceData}
        visible={withdrawalModalVisible}
        withdrawable={withdrawable}
      />
    </DashboardScreen>
  );
};

const styles = StyleSheet.create({
  noticeSpacing: {
    marginTop: 10,
  },
  metricsSpacing: {
    marginTop: 16,
  },
  emptyCard: {
    alignItems: 'center',
    marginBottom: 0,
    paddingVertical: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    marginTop: 12,
  },
  emptyMessage: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  historyHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  historyAmountWrap: {
    flex: 1,
  },
  historyLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  historyAmount: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: 23,
    marginTop: 3,
  },
  modalOverlay: {
    backgroundColor: 'rgba(7, 26, 61, 0.62)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '94%',
    overflow: 'hidden',
    ...shadows.soft,
  },
  modalHeader: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  modalTitleWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  modalIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  modalTitleCopy: {
    flex: 1,
    marginLeft: 11,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginLeft: 8,
    width: 40,
  },
  modalBody: {
    padding: 18,
    paddingBottom: 34,
  },
  balancePanel: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  balanceLabel: {
    color: '#047857',
    fontFamily: typography.semibold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: '#065F46',
    fontFamily: typography.bold,
    fontSize: 27,
    marginTop: 5,
  },
  balanceHint: {
    color: '#047857',
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  verifyButton: {
    marginBottom: 14,
    marginTop: -4,
  },
  verificationNotice: {
    alignItems: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 16,
    padding: 12,
  },
  verificationSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  verificationWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  verificationText: {
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  verificationTextSuccess: {
    color: '#047857',
  },
  verificationTextWarning: {
    color: '#92400E',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  modalAction: {
    flex: 1,
  },
});

export default LgaFinancialAdminDashboardScreen;
