import React, { useMemo, useState } from 'react';
import {Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Input from '../common/Input';
import Button from '../common/Button';
import { colors, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

const WalletFundModal = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
  userType = 'tenant',
  walletBalance,
  landlordWallet,
  onSwitchToWithdraw,
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paystack');

  const selectedBalance = useMemo(() => {
    if (userType === 'tenant') return walletBalance;
    return landlordWallet?.available_to_withdraw || 0;
  }, [userType, walletBalance, landlordWallet]);

  const handleClose = () => {
    setAmount('');
    setPaymentMethod('paystack');
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Icon name="wallet-outline" size={22} color="#0d9488" />
              <AppText style={styles.title}>Fund Wallet</AppText>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {selectedBalance !== null && selectedBalance !== undefined ? (
              <View style={styles.balanceCard}>
                <AppText style={styles.balanceLabel}>Current Balance</AppText>
                <AppText style={styles.balanceValue}>
                  ₦{Number(selectedBalance || 0).toLocaleString()}
                </AppText>
              </View>
            ) : null}

            <AppText style={styles.sectionLabel}>Select or enter amount</AppText>
            <View style={styles.presetGrid}>
              {PRESET_AMOUNTS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetBtn,
                    Number(amount) === preset && styles.presetBtnActive,
                  ]}
                  onPress={() => setAmount(String(preset))}
                >
                  <AppText 
                    style={[
                      styles.presetText,
                      Number(amount) === preset && styles.presetTextActive,
                    ]}
                  >
                    ₦{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Custom Amount (₦)"
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount e.g. 15000"
              keyboardType="number-pad"
            />

            <AppText style={styles.sectionLabel}>Choose how to pay</AppText>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setPaymentMethod('paystack')}
              style={[styles.methodCard, paymentMethod === 'paystack' && styles.methodCardActive]}
            >
              <Icon name="card-outline" size={20} color="#0d9488" />
              <View style={styles.methodCopy}>
                <AppText style={styles.methodTitle}>Pay with card</AppText>
                <AppText style={styles.methodText}>Card, bank account or USSD</AppText>
              </View>
              <Icon
                name={paymentMethod === 'paystack' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={paymentMethod === 'paystack' ? '#0d9488' : '#94a3b8'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setPaymentMethod('bank_transfer')}
              style={[styles.methodCard, paymentMethod === 'bank_transfer' && styles.methodCardActive]}
            >
              <Icon name="business-outline" size={20} color="#0d9488" />
              <View style={styles.methodCopy}>
                <AppText style={styles.methodTitle}>Pay by bank transfer</AppText>
                <AppText style={styles.methodText}>Transfer to your account and upload a screenshot</AppText>
              </View>
              <Icon
                name={paymentMethod === 'bank_transfer' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={paymentMethod === 'bank_transfer' ? '#0d9488' : '#94a3b8'}
              />
            </TouchableOpacity>

            <View style={styles.noteCard}>
              <Icon name="shield-checkmark-outline" size={18} color="#16a34a" />
              <AppText style={styles.noteText}>
                {paymentMethod === 'bank_transfer'
                  ? 'Transfer from your bank app, then upload the transfer screenshot. Your wallet is credited after confirmation.'
                  : 'Payment is processed securely via Paystack. Your wallet is credited after successful payment.'}
              </AppText>
            </View>

            <Button
              title={loading ? 'Preparing payment...' : `Pay ₦${amount ? Number(amount).toLocaleString() : '0'}`}
              onPress={() => onSubmit?.(amount, paymentMethod)}
              loading={loading}
              disabled={loading || !amount || Number(amount) < 100}
            />

            <TouchableOpacity style={styles.switchLink} onPress={onSwitchToWithdraw}>
              <AppText style={styles.switchText}>Need to withdraw instead? Open Withdraw Funds</AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '90%',
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
  title: { fontFamily: typography.bold, fontSize: 18, color: '#0f172a' },
  body: { padding: 16, paddingBottom: 28, gap: 12 },
  balanceCard: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 12,
    padding: 14,
  },
  balanceLabel: { color: '#0f766e', fontSize: 13, fontWeight: '600' },
  balanceValue: { fontFamily: typography.bold, color: '#115e59', fontSize: 24, marginTop: 4 },
  sectionLabel: { color: '#334155', fontWeight: '700', marginTop: 4 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  presetBtnActive: { borderColor: '#0d9488', backgroundColor: '#f0fdfa' },
  presetText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  presetTextActive: { color: '#0f766e' },
  noteCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, color: '#166534', fontSize: 13, lineHeight: 18 },
  methodCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  methodCardActive: { borderColor: '#0d9488', backgroundColor: '#f0fdfa' },
  methodCopy: { flex: 1 },
  methodTitle: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  methodText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  switchLink: { marginTop: 4, alignItems: 'center' },
  switchText: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
});

export default WalletFundModal;
