import React, { useEffect, useState } from 'react';
import { Image, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from './common/Button';
import Input from './common/Input';
import AppText from './common/AppText';
import { radius, typography } from '../theme';
import { cameraService } from '../services/cameraService';
import bankTransferService from '../services/bankTransferService';
import api from '../services/api';

const formatNumber = (value) => Number(value || 0).toLocaleString();

export default function BankTransferCheckout({
  visible,
  onClose,
  mode = 'registration',
  amount,
  reference,
  accounts: providedAccounts = [],
  virtualAccount = null,
  statusEndpoint,
  onRegistrationPaid,
  onRegistrationApproved,
  onWalletCredited,
  onSubmitted,
}) {
  const [accounts, setAccounts] = useState(providedAccounts || []);
  const [accountsLoading, setAccountsLoading] = useState(!providedAccounts?.length);
  const [accountId, setAccountId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerBank, setPayerBank] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofAsset, setProofAsset] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paid, setPaid] = useState(false);
  const [creditsBaseline, setCreditsBaseline] = useState(null);

  useEffect(() => {
    setAccounts(providedAccounts || []);
    setAccountsLoading(!providedAccounts?.length);
  }, [providedAccounts]);

  useEffect(() => {
    let active = true;
    if (providedAccounts?.length) return undefined;
    setAccountsLoading(true);
    bankTransferService
      .getAccounts()
      .then((res) => {
        if (!active) return;
        setAccounts(res?.data || []);
      })
      .catch(() => {
        if (active) setAccounts([]);
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [providedAccounts]);

  useEffect(() => {
    let active = true;
    if (!virtualAccount) return undefined;
    if (paid) return undefined;
    const poll = async () => {
      try {
        if (mode === 'registration') {
          if (!statusEndpoint && !reference) return;
          const url = statusEndpoint || `/virtual-accounts/registration/${reference}`;
          const response = await api.get(url, { skipAuth: true, skipAuthRefresh: true });
          const data = response?.data?.data;
          if (active && data?.paid) {
            setPaid(true);
            if (onRegistrationPaid) onRegistrationPaid(data);
          }
          return;
        }
        const response = await api.get('/virtual-accounts/wallet/credits');
        const credits = response?.data?.data?.credits || [];
        const newest = credits[0]?.payment_id || 0;
        if (creditsBaseline === null) {
          setCreditsBaseline(newest);
          return;
        }
        if (newest > creditsBaseline && active) {
          setCreditsBaseline(newest);
          setPaid(true);
          if (onWalletCredited) onWalletCredited(credits[0]);
        }
      } catch (error) {
        // polling best effort
      }
    };
    poll();
    const timer = setInterval(poll, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [virtualAccount, mode, statusEndpoint, reference, paid, creditsBaseline, onRegistrationPaid, onWalletCredited]);

  useEffect(() => {
    if (!submitted || mode !== 'registration' || !reference) return undefined;
    let active = true;
    const check = async () => {
      try {
        const response = await bankTransferService.getRegistrationStatus(reference);
        const data = response?.data;
        if (active && (data?.registered || data?.status === 'approved')) {
          if (onRegistrationApproved) onRegistrationApproved(data);
        }
      } catch (error) {
        // next tick retries
      }
    };
    const timer = setInterval(check, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [submitted, mode, reference, onRegistrationApproved]);

  const selectedAccount = accounts.find((account) => String(account.id) === String(accountId));

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const result = await cameraService.pickTransferScreenshot();
      if (result.cancelled) {
        if (result.message) Toast.show({ type: 'info', text1: 'Selection cancelled', text2: result.message });
        return;
      }
      if (result.proofImage) {
        setProofImage(result.proofImage);
        setProofAsset(result.asset || null);
        Toast.show({ type: 'success', text1: 'Screenshot selected' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not prepare screenshot' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Could not select screenshot' });
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (submitted) return;
    if (!accountId) {
      Toast.show({ type: 'error', text1: 'Missing info', text2: 'Choose the account you paid into' });
      return;
    }
    if (!payerName.trim()) {
      Toast.show({ type: 'error', text1: 'Missing info', text2: 'Enter the name on the account you paid from' });
      return;
    }
    if (!proofImage) {
      Toast.show({ type: 'error', text1: 'Missing info', text2: 'Select your transfer screenshot first' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reference,
        bank_account_id: Number(accountId),
        payer_name: payerName.trim(),
        payer_bank: payerBank.trim() || null,
        proof_image: proofImage,
      };
      const response = mode === 'wallet'
        ? await bankTransferService.submitWalletProof({ ...payload, amount: Number(amount) })
        : await bankTransferService.submitRegistrationProof(payload);
      if (response?.success) {
        setSubmitted(true);
        if (onSubmitted) onSubmitted(response.data);
        Toast.show({ type: 'success', text1: 'Proof submitted', text2: 'We will review and confirm shortly.' });
      } else {
        Toast.show({ type: 'error', text1: 'Submission failed', text2: response?.message || 'Please try again' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Submission failed', text2: error?.response?.data?.message || error.message || 'Please try again' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAccountId('');
    setPayerName('');
    setPayerBank('');
    setProofImage('');
    setProofAsset(null);
    setSubmitted(false);
    setPaid(false);
    setCreditsBaseline(null);
    onClose?.();
  };

  if (!visible) return null;

  if (paid) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.successBody}>
              <Icon name="checkmark-circle" size={48} color="#16a34a" />
              <AppText style={styles.successTitle}>Payment confirmed</AppText>
              <AppText style={styles.successText}>
                {mode === 'registration'
                  ? 'Your transfer was received. Your account is being created.'
                  : 'Your transfer was received and your wallet has been credited.'}
              </AppText>
              <Button title="Close" onPress={handleClose} style={styles.cta} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (submitted) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <Icon name="time-outline" size={22} color="#0d9488" />
                <AppText style={styles.title}>Awaiting approval</AppText>
              </View>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.pendingBody}>
              <AppText style={styles.pendingText}>
                Your transfer screenshot was submitted. An admin will review it and your account/wallet will be updated once confirmed.
              </AppText>
              {reference ? <AppText style={styles.refText}>Reference: {reference}</AppText> : null}
              <Button title="Close" onPress={handleClose} style={styles.cta} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Icon name="business-outline" size={22} color="#0d9488" />
              <AppText style={styles.title}>Bank Transfer</AppText>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.amountCard}>
              <AppText style={styles.amountLabel}>{virtualAccount ? 'Transfer to this account' : 'Amount to pay'}</AppText>
              <AppText style={styles.amountValue}>
                {virtualAccount && amount ? `₦${formatNumber(amount)}` : `₦${formatNumber(amount || 0)}`}
              </AppText>
              <AppText style={styles.amountNote}>
                {virtualAccount ? 'This account belongs to you. The bank confirms automatically.' : 'Send exactly this amount to the account below and upload your screenshot.'}
              </AppText>
            </View>

            {virtualAccount ? (
              <View style={styles.accountCard}>
                <AppText style={styles.sectionTitle}>Transfer details</AppText>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Bank</AppText>
                  <AppText style={styles.detailValue}>{virtualAccount.bank_name}</AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Account name</AppText>
                  <AppText style={styles.detailValue}>{virtualAccount.account_name}</AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={styles.detailLabel}>Account number</AppText>
                  <AppText style={styles.detailValue}>{virtualAccount.account_number}</AppText>
                </View>
                {reference ? (
                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Reference</AppText>
                    <AppText style={styles.detailValue}>{reference}</AppText>
                  </View>
                ) : null}
                <AppText style={styles.listeningText}>Listening for your transfer…</AppText>
              </View>
            ) : (
              <>
                <AppText style={styles.sectionTitle}>Select account to pay into</AppText>
                {accountsLoading ? (
                  <AppText style={styles.mutedText}>Loading accounts...</AppText>
                ) : accounts.length === 0 ? (
                  <AppText style={styles.mutedText}>No bank accounts available. Please try again later.</AppText>
                ) : (
                  <View style={styles.accountsList}>
                    {accounts.map((account) => {
                      const active = String(account.id) === String(accountId);
                      return (
                        <TouchableOpacity
                          key={account.id}
                          onPress={() => setAccountId(String(account.id))}
                          style={[styles.accountItem, active && styles.accountItemActive]}
                        >
                          <View style={{ flex: 1 }}>
                            <AppText style={[styles.accountBank, active && styles.accountBankActive]}>{account.bank_name}</AppText>
                            <AppText style={styles.accountName}>{account.account_name}</AppText>
                            <AppText style={styles.accountNumber}>{account.account_number}</AppText>
                          </View>
                          {active ? <Icon name="checkmark-circle" size={22} color="#0d9488" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Input label="Name on the account you paid from" value={payerName} onChangeText={setPayerName} placeholder="Enter payer name" />
                <Input label="Bank you paid from (optional)" value={payerBank} onChangeText={setPayerBank} placeholder="e.g. GTBank" />

                <AppText style={styles.sectionTitle}>Transfer screenshot</AppText>
                <Button
                  title={capturing ? 'Selecting...' : proofImage ? 'Change screenshot' : 'Select screenshot'}
                  onPress={handleCapture}
                  loading={capturing}
                  variant={proofImage ? 'outline' : 'primary'}
                />
                {proofAsset?.uri && !proofImage?.startsWith('data:') && Platform.OS === 'web' ? (
                  <Image source={{ uri: proofAsset.uri }} style={styles.preview} resizeMode="contain" />
                ) : null}
                {proofImage?.startsWith('data:') ? (
                  <Image source={{ uri: proofImage }} style={styles.preview} resizeMode="contain" />
                ) : null}

                <Button title={submitting ? 'Submitting...' : 'Submit proof'} onPress={handleSubmit} loading={submitting} disabled={submitting} style={styles.cta} />
              </>
            )}

            {virtualAccount && onClose ? (
              <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
                <AppText style={styles.cancelText}>Cancel</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: typography.bold, fontSize: 18, color: '#0f172a' },
  body: { padding: 16, paddingBottom: 28, gap: 12 },
  amountCard: { backgroundColor: '#f0fdfa', borderWidth: 1, borderColor: '#99f6e4', borderRadius: radius.lg, padding: 14 },
  amountLabel: { color: '#0f766e', fontSize: 13, fontWeight: '600' },
  amountValue: { fontFamily: typography.bold, color: '#115e59', fontSize: 26, marginTop: 4 },
  amountNote: { color: '#0f766e', fontSize: 12, marginTop: 4 },
  accountCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: radius.lg, padding: 14, gap: 8 },
  sectionTitle: { color: '#334155', fontWeight: '700', marginTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { color: '#64748b', fontSize: 13 },
  detailValue: { color: '#0f172a', fontSize: 14, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  listeningText: { color: '#16a34a', fontWeight: '600', fontSize: 13, marginTop: 4 },
  accountsList: { gap: 8 },
  accountItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: radius.lg, padding: 12, gap: 10 },
  accountItemActive: { borderColor: '#0d9488', backgroundColor: '#f0fdfa' },
  accountBank: { color: '#0f172a', fontWeight: '700' },
  accountBankActive: { color: '#115e59' },
  accountName: { color: '#475569', fontSize: 13 },
  accountNumber: { color: '#0f172a', fontFamily: typography.bold, marginTop: 2 },
  mutedText: { color: '#64748b', fontSize: 13 },
  preview: { width: '100%', height: 200, backgroundColor: '#f8fafc', borderRadius: radius.lg, borderWidth: 1, borderColor: '#e2e8f0' },
  cta: { marginTop: 6 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#475569', fontWeight: '600' },
  successBody: { alignItems: 'center', padding: 28, gap: 10 },
  successTitle: { fontFamily: typography.bold, fontSize: 20, color: '#065f46' },
  successText: { color: '#065f46', textAlign: 'center' },
  pendingBody: { padding: 18, gap: 10 },
  pendingText: { color: '#334155' },
  refText: { color: '#475569', fontFamily: typography.bold },
});
