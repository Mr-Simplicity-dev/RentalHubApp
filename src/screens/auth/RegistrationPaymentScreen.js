import AssistedPasswordForm from '../../components/common/AssistedPasswordForm';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, View, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import AppText from '../../components/common/AppText';
import Button from '../../components/common/Button';
import BankTransferCheckout from '../../components/BankTransferCheckout';
import { useLanguage } from '../../context/LanguageContext';
import copy from '../../i18n/assistedRegistration.json';
import { colors, radius, typeScale, typography } from '../../theme';
export default function RegistrationPaymentScreen() {
  const {
    language
  } = useLanguage();
  const c = copy[language] || copy.en;
  const {
    user,
    updateUser,
    logout
  } = useContext(AuthContext);
  const update = useRef(updateUser);
  update.current = updateUser;
  const [record, setRecord] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = async () => {
    const r = await api.get('/assisted-registration/me');
    setRecord(r.data.data);
    if (r.data.data.status === 'paid') {
      const me = await api.get('/auth/me');
      await update.current(me.data.data);
    }
  };
  useEffect(() => {
    let active = true;
    const load = () => {
      if (active) refresh().catch(() => setMessage('Unable to check payment. Please retry.'));
    };
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const pay = async method => {
    setBusy(true);
    setMessage('');
    try {
      const r = await api.post('/assisted-registration/payment', {
        method
      });
      if (r.data.data.paid) return await refresh();
      if (r.data.data.authorization_url) {
        const url = r.data.data.authorization_url;
        if (!url.startsWith('https://checkout.paystack.com/')) throw new Error('Payment link unavailable');
        await Linking.openURL(url);
      } else setCheckout(r.data.data);
    } catch (e) {
      setMessage(e.response?.data?.message || 'Unable to start payment. Please retry.');
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      await api.post('/assisted-registration/payment/verify');
      await refresh();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Payment is not confirmed yet.');
    } finally {
      setBusy(false);
    }
  };
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}><View style={styles.card}><AppText style={styles.eyebrow}>{c.paymentTitle}</AppText><AppText style={styles.title}>{c.welcome}, {user?.full_name}</AppText><AppText style={styles.body}>{c.paymentHelp}</AppText>{record && <><AppText style={styles.amount}>₦{Number(record.amount).toLocaleString('en-NG')}</AppText><AppText style={styles.reference}>{c.ref}: {record.reference}</AppText><Button title={c.transfer} loading={busy} onPress={() => pay('bank_transfer')} />{record.email && <Button variant="outline" title={c.card} disabled={busy} onPress={() => pay('paystack')} />}<Button title={c.checkCard} variant="outline" disabled={busy} onPress={verify} /><Button title={c.refresh} variant="outline" disabled={busy} onPress={() => refresh().catch(() => setMessage('Unable to check payment.'))} /><AppText style={styles.body}>{c.cashHelp}</AppText></>}{message ? <AppText accessibilityLiveRegion="polite" style={styles.body}>{message}</AppText> : null}<Button title={c.signOut} variant="outline" onPress={logout} /></View><AssistedPasswordForm /></ScrollView>{checkout && record && <BankTransferCheckout visible onClose={() => setCheckout(null)} amount={record.amount} reference={record.reference} accounts={checkout.bank_accounts} virtualAccount={checkout.account} statusEndpoint={'/virtual-accounts/registration/' + encodeURIComponent(record.reference)} onRegistrationPaid={refresh} onRegistrationApproved={refresh} onSubmitted={() => {
      setCheckout(null);
      setMessage('Transfer submitted for review.');
    }} />}</SafeAreaView>;
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.surface
  },
  content: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center'
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    gap: 16
  },
  eyebrow: {
    fontSize: typeScale.sm,
    color: colors.navy,
    fontFamily: typography.semibold
  },
  title: {
    fontSize: typeScale.xxl,
    fontFamily: typography.bold,
    color: colors.ink
  },
  amount: {
    fontSize: 32,
    fontFamily: typography.bold,
    color: colors.ink
  },
  body: {
    fontSize: typeScale.base,
    lineHeight: 24,
    color: colors.muted
  },
  reference: {
    fontSize: typeScale.xs,
    color: colors.muted
  }
});
