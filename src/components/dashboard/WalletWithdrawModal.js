import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Input from '../common/Input';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import OptionPickerModal from '../common/OptionPickerModal';
import { colors, typography } from '../../theme';
import { paymentService } from '../../services/paymentService';
import { pickList } from '../../utils/http';

const FALLBACK_BANKS = [
  'Access Bank',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'Guaranty Trust Bank (GTBank)',
  'United Bank for Africa (UBA)',
  'Zenith Bank',
  'Wema Bank',
  'Sterling Bank',
  'Union Bank of Nigeria',
  'Stanbic IBTC Bank',
];

const WalletWithdrawModal = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
  userType = 'tenant',
  walletBalance,
  landlordWallet,
  propertyFeeReserve,
  withdrawForm,
  setWithdrawForm,
  withdrawHistory = [],
  onSwitchToFund,
}) => {
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [accountNameLoading, setAccountNameLoading] = useState(false);
  const [accountNameError, setAccountNameError] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const loadBanks = async () => {
      setBanksLoading(true);
      try {
        const response = await paymentService.getBanks();
        const bankList = pickList(response, ['data']);
        setBanks(
          bankList.length
            ? bankList.map((bank) => bank.name || bank)
            : FALLBACK_BANKS.map((name) => ({ name }))
        );
      } catch (error) {
        setBanks(FALLBACK_BANKS.map((name) => ({ name })));
      } finally {
        setBanksLoading(false);
      }
    };

    loadBanks();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setConsentChecked(false);
      setAccountNameError('');
    }
  }, [visible]);

  const fetchAccountName = async (bankName, accountNumber) => {
    if (!bankName || !accountNumber || accountNumber.length !== 10) {
      setAccountNameError('');
      return;
    }

    setAccountNameLoading(true);
    setAccountNameError('');

    try {
      const response = await paymentService.verifyBankAccount({
        bank_name: bankName,
        account_number: accountNumber,
      });

      if (response?.success && response.data?.account_name) {
        setWithdrawForm((prev) => ({
          ...prev,
          account_name: response.data.account_name,
        }));
        setAccountNameError('');
      } else {
        setAccountNameError('Unable to fetch account name. Enter manually.');
      }
    } catch (error) {
      setAccountNameError(
        error?.response?.data?.message || 'Failed to verify account. Enter manually.'
      );
    } finally {
      setAccountNameLoading(false);
    }
  };

  const handleAccountNumberChange = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
    setWithdrawForm((prev) => ({
      ...prev,
      account_number: digits,
      account_name: prev.account_name && digits.length === 10 ? prev.account_name : '',
    }));

    if (digits.length === 10 && withdrawForm.bank_name) {
      fetchAccountName(withdrawForm.bank_name, digits);
    }
  };

  const handleBankSelect = (bankName) => {
    setWithdrawForm((prev) => ({
      ...prev,
      bank_name: bankName,
      account_name: '',
    }));
    setShowBankPicker(false);

    if (withdrawForm.account_number?.length === 10) {
      fetchAccountName(bankName, withdrawForm.account_number);
    }
  };

  const handleClose = () => {
    setConsentChecked(false);
    setAccountNameError('');
    onClose?.();
  };

  const bankOptions = banks.map((bank) => ({
    label: bank.name || bank,
    value: bank.name || bank,
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Icon name="cash-outline" size={22} color="#4f46e5" />
              <Text style={styles.title}>Withdraw Funds</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {userType === 'tenant' ? (
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Wallet Balance</Text>
                <Text style={styles.balanceValue}>
                  {walletBalance !== null && walletBalance !== undefined
                    ? `₦${Number(walletBalance).toLocaleString()}`
                    : '—'}
                </Text>
              </View>
            ) : landlordWallet ? (
              <View style={styles.landlordGrid}>
                <View style={[styles.balanceCard, styles.balanceCardGreen]}>
                  <Text style={styles.balanceLabel}>Available to Withdraw</Text>
                  <Text style={styles.balanceValue}>
                    ₦{Number(landlordWallet.available_to_withdraw || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.balanceCard, styles.balanceCardAmber]}>
                  <Text style={styles.balanceLabel}>Pending (14-day hold)</Text>
                  <Text style={styles.balanceValue}>
                    ₦{Number(landlordWallet.pending_balance || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            ) : (
              <ActivityIndicator color="#0284c7" />
            )}

            {propertyFeeReserve?.reserve_required &&
            Number(propertyFeeReserve?.amount_due || 0) > 0 ? (
              <View style={styles.warningCard}>
                <Icon name="warning-outline" size={18} color="#b45309" />
                <Text style={styles.warningText}>
                  {(propertyFeeReserve.fee_label || 'Landlord Property Charges')} reserve: ₦
                  {Number(propertyFeeReserve.amount_due || 0).toLocaleString()} is due on{' '}
                  {new Date(propertyFeeReserve.due_at).toLocaleDateString()}.
                </Text>
              </View>
            ) : null}

            <Input
              label="Amount (₦)"
              value={withdrawForm.amount}
              onChangeText={(value) =>
                setWithdrawForm((prev) => ({ ...prev, amount: value }))
              }
              placeholder="Enter amount to withdraw"
              keyboardType="number-pad"
            />

            <SelectField
              label="Bank"
              value={withdrawForm.bank_name}
              placeholder={banksLoading ? 'Loading banks...' : 'Select bank'}
              onPress={() => setShowBankPicker(true)}
              disabled={banksLoading}
            />

            <Input
              label="Account Number"
              value={withdrawForm.account_number}
              onChangeText={handleAccountNumberChange}
              placeholder="10-digit account number"
              keyboardType="number-pad"
              maxLength={10}
            />

            {accountNameLoading ? (
              <ActivityIndicator color="#0284c7" />
            ) : null}

            {accountNameError ? (
              <Text style={styles.errorText}>{accountNameError}</Text>
            ) : null}

            <Input
              label="Account Name"
              value={withdrawForm.account_name}
              onChangeText={(value) =>
                setWithdrawForm((prev) => ({ ...prev, account_name: value }))
              }
              placeholder="Account holder name"
            />

            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentChecked((prev) => !prev)}
            >
              <Icon
                name={consentChecked ? 'checkbox' : 'square-outline'}
                size={22}
                color={consentChecked ? '#0284c7' : '#94a3b8'}
              />
              <Text style={styles.consentText}>
                I confirm that my bank details are correct.
              </Text>
            </TouchableOpacity>

            <Button
              title="Submit Withdrawal"
              onPress={() => onSubmit?.(consentChecked)}
              loading={loading}
              disabled={
                loading ||
                !withdrawForm.amount ||
                !withdrawForm.bank_name ||
                !withdrawForm.account_number ||
                !withdrawForm.account_name ||
                !consentChecked
              }
            />

            <TouchableOpacity style={styles.switchLink} onPress={onSwitchToFund}>
              <Text style={styles.switchText}>Need to fund wallet first? Open Fund Wallet</Text>
            </TouchableOpacity>

            {withdrawHistory.length > 0 ? (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>Recent Withdrawals</Text>
                {withdrawHistory.slice(0, 5).map((item) => (
                  <View key={String(item.id)} style={styles.historyItem}>
                    <Text style={styles.historyAmount}>
                      ₦{Number(item.amount || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {item.status || 'pending'} · {item.bank_name || 'Bank'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <OptionPickerModal
        visible={showBankPicker}
        title="Select Bank"
        options={bankOptions}
        onSelect={(option) => handleBankSelect(option.value)}
        onClose={() => setShowBankPicker(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: typography.bold, fontSize: 18, color: colors.ink },
  body: { padding: 16, paddingBottom: 28, gap: 12 },
  balanceCard: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 12,
    padding: 14,
  },
  balanceCardGreen: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  balanceCardAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  landlordGrid: { flexDirection: 'row', gap: 10 },
  balanceLabel: { fontFamily: typography.semibold, color: '#475569', fontSize: 12 },
  balanceValue: { fontFamily: typography.bold, color: colors.ink, fontSize: 20, marginTop: 4 },
  warningCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  warningText: { flex: 1, color: '#92400e', fontSize: 12, lineHeight: 18 },
  errorText: { color: '#dc2626', fontSize: 12 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  consentText: { flex: 1, color: '#334155', fontSize: 13 },
  switchLink: { alignItems: 'center' },
  switchText: { color: '#0d9488', fontWeight: '600', fontSize: 13 },
  historySection: { marginTop: 8 },
  historyTitle: { fontFamily: typography.bold, color: colors.ink, marginBottom: 8 },
  historyItem: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  historyAmount: { fontFamily: typography.bold, color: colors.ink },
  historyMeta: { marginTop: 2, color: colors.muted, fontSize: 12 },
});

export default WalletWithdrawModal;
