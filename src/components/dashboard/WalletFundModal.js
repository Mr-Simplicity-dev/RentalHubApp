import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Input from '../common/Input';
import Button from '../common/Button';
import { colors, typography } from '../../theme';

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

  const selectedBalance = useMemo(() => {
    if (userType === 'tenant') return walletBalance;
    return landlordWallet?.available_to_withdraw || 0;
  }, [userType, walletBalance, landlordWallet]);

  const handleClose = () => {
    setAmount('');
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Icon name="wallet-outline" size={22} color="#0d9488" />
              <Text style={styles.title}>Fund Wallet</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {selectedBalance !== null && selectedBalance !== undefined ? (
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceValue}>
                  ₦{Number(selectedBalance || 0).toLocaleString()}
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Select or enter amount</Text>
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
                  <Text
                    style={[
                      styles.presetText,
                      Number(amount) === preset && styles.presetTextActive,
                    ]}
                  >
                    ₦{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </Text>
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

            <View style={styles.noteCard}>
              <Icon name="shield-checkmark-outline" size={18} color="#16a34a" />
              <Text style={styles.noteText}>
                Payment is processed securely via Paystack. Your wallet is credited after successful payment.
              </Text>
            </View>

            <Button
              title={loading ? 'Preparing payment...' : `Pay ₦${amount ? Number(amount).toLocaleString() : '0'}`}
              onPress={() => onSubmit?.(amount)}
              loading={loading}
              disabled={loading || !amount || Number(amount) < 100}
            />

            <TouchableOpacity style={styles.switchLink} onPress={onSwitchToWithdraw}>
              <Text style={styles.switchText}>Need to withdraw instead? Open Withdraw Funds</Text>
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
  switchLink: { marginTop: 4, alignItems: 'center' },
  switchText: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
});

export default WalletFundModal;
