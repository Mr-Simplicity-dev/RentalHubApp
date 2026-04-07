import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { paymentService } from '../../services/paymentService';
import { getErrorMessage, pickList } from '../../utils/http';

const PAYMENT_TYPE_LABELS = {
  tenant_subscription: 'Subscription',
  property_unlock: 'Property Unlock',
  landlord_listing: 'Listing Payment',
  rent_payment: 'Rent Payment',
  general_platform_fee: 'General Platform Payment',
};

const formatAmount = (amount) => `NGN ${Number(amount || 0).toLocaleString()}`;

const formatPaymentType = (paymentType) =>
  PAYMENT_TYPE_LABELS[paymentType] ||
  String(paymentType || 'payment')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const statusStyle = (status) => {
  if (status === 'completed') return styles.statusCompleted;
  if (status === 'pending') return styles.statusPending;
  if (status === 'failed') return styles.statusFailed;
  return styles.statusDefault;
};

const PaymentHistoryScreen = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await paymentService.getPaymentHistory({ limit: 50 });
      setPayments(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load payment history'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Payment History</Text>

      {payments.length === 0 ? (
        <Text style={styles.empty}>No payment history yet.</Text>
      ) : (
        payments.map((payment) => (
          <View key={String(payment.id)} style={styles.card}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.type}>{formatPaymentType(payment.payment_type)}</Text>
                <Text style={styles.meta}>{payment.property_title || 'General platform payment'}</Text>
                <Text style={styles.meta}>
                  {payment.created_at ? new Date(payment.created_at).toLocaleString() : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amount}>{formatAmount(payment.amount)}</Text>
                <Text style={[styles.statusPill, statusStyle(payment.payment_status)]}>
                  {payment.payment_status || 'unknown'}
                </Text>
                <Text style={styles.meta}>{payment.payment_method || 'N/A'}</Text>
              </View>
            </View>
            {payment.transaction_reference ? (
              <Text style={styles.reference}>Ref: {payment.transaction_reference}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  empty: { color: '#64748b' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  type: { color: '#0f172a', fontWeight: '700' },
  amount: { color: '#0f172a', fontWeight: '800' },
  meta: { color: '#64748b', marginTop: 4, fontSize: 12 },
  statusPill: {
    marginTop: 6,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '700',
  },
  statusCompleted: { backgroundColor: '#dcfce7', color: '#15803d' },
  statusPending: { backgroundColor: '#fef9c3', color: '#a16207' },
  statusFailed: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  statusDefault: { backgroundColor: '#e2e8f0', color: '#334155' },
  reference: { marginTop: 8, color: '#64748b', fontSize: 12 },
});

export default PaymentHistoryScreen;
