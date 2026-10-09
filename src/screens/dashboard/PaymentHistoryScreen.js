import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { paymentService } from '../../services/paymentService';
import { colors, radius, typography } from '../../theme';
import { getErrorMessage, pickList } from '../../utils/http';

import AppText from '../../components/common/AppText';
import BrandMark from '../../components/brand/BrandMark';
import { AuthContext } from '../../context/AuthContext';
import { useTourTarget } from '../../components/tour/TourTarget';
const PAYMENT_TYPE_LABELS = {
  tenant_subscription: 'Subscription',
  property_unlock: 'Property details',
  landlord_listing: 'Property listing',
  rent_payment: 'Rent payment',
  general_platform_fee: 'Platform payment',
  wallet_funding: 'Wallet funding',
};

const CHANNEL_LABELS = {
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  bank: 'Bank',
  ussd: 'USSD',
  qr: 'QR Code',
  mobile_money: 'Mobile Money',
  pos: 'POS',
  transfer: 'Transfer',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};
const humanizeChannel = (channel) =>
  CHANNEL_LABELS[channel] ||
  String(channel || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
  '';

const formatAmount = (amount) => `₦${Number(amount || 0).toLocaleString()}`;

const formatPaymentType = (paymentType) =>
  PAYMENT_TYPE_LABELS[paymentType] ||
  String(paymentType || 'payment')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const statusVisual = (status) => {
  if (status === 'completed' || status === 'successful' || status === 'success') {
    return { color: colors.success, background: '#EAF9F2', icon: 'checkmark-circle' };
  }
  if (status === 'pending') {
    return { color: '#B46B00', background: '#FFF6DD', icon: 'time' };
  }
  if (status === 'failed') {
    return { color: colors.danger, background: '#FFF0EF', icon: 'close-circle' };
  }
  return { color: colors.muted, background: colors.surface, icon: 'help-circle' };
};

const PaymentHistoryScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const paymentTourTarget = useTourTarget(
    user?.user_type === 'landlord' ? 'landlord_wallet' : 'tenant_payments',
    { padding: 6, radius: 18 }
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptBusy, setReceiptBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadPayments = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await paymentService.getPaymentHistory({ limit: 50 });
      setPayments(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not load payments',
        text2: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const completedPayments = useMemo(
    () =>
      payments.filter((payment) =>
        ['completed', 'successful', 'success'].includes(payment.payment_status)
      ),
    [payments]
  );
  const completedTotal = useMemo(
    () => completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [completedPayments]
  );
  const visiblePayments = useMemo(
    () =>
      filter === 'all'
        ? payments
        : payments.filter((payment) =>
            filter === 'completed'
              ? ['completed', 'successful', 'success'].includes(payment.payment_status)
              : payment.payment_status === filter
          ),
    [filter, payments]
  );

  const isCompletedPayment = (payment) =>
    ['completed', 'successful', 'success'].includes(payment.payment_status);

  const saveReceiptPdf = async (payment) => {
    const buffer = await paymentService.downloadReceiptPdf(payment.id);
    const fileName = `receipt-${String(payment.id || '0').padStart(6, '0')}.pdf`;
    const file = new File(Paths.cache, fileName);
    try {
      file.delete();
    } catch {}
    file.create();
    file.write(new Uint8Array(buffer));
    return file;
  };

  const handleShareReceipt = async () => {
    if (!selectedReceipt) return;
    setReceiptBusy(true);
    try {
      const file = await saveReceiptPdf(selectedReceipt);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Receipt',
        });
      } else {
        Toast.show({ type: 'info', text1: 'Saved', text2: `Receipt saved to ${file.uri}` });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not share receipt', text2: getErrorMessage(error, 'Please try again.') });
    } finally {
      setReceiptBusy(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!selectedReceipt) return;
    setReceiptBusy(true);
    try {
      const file = await saveReceiptPdf(selectedReceipt);
      Toast.show({ type: 'success', text1: 'Receipt saved', text2: `Saved to ${file.uri}` });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not download receipt', text2: getErrorMessage(error, 'Please try again.') });
    } finally {
      setReceiptBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View {...paymentTourTarget} style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>TRANSACTIONS</AppText>
          <AppText style={styles.title}>Payment history</AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        contentContainerStyle={[styles.list, !visiblePayments.length && styles.emptyList]}
        data={visiblePayments}
        keyExtractor={(item, index) => String(item.id || item.transaction_reference || index)}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Icon name="wallet-outline" size={23} color={colors.gold} />
              </View>
              <AppText style={styles.summaryLabel}>Completed transaction value</AppText>
              <AppText style={styles.summaryAmount}>{formatAmount(completedTotal)}</AppText>
              <AppText style={styles.summaryMeta}>
                {completedPayments.length} completed · {payments.length} total transactions
              </AppText>
            </View>
            <View style={styles.filterRow}>
              {['all', 'completed', 'pending', 'failed'].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.filterChip, filter === value && styles.filterChipActive]}>
                  <AppText style={[styles.filterText, filter === value && styles.filterTextActive]}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} size="large" />
              <AppText style={styles.loadingText}>Loading transactions…</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="receipt-outline" size={31} color={colors.blue} />
              </View>
              <AppText style={styles.emptyTitle}>No transactions here</AppText>
              <AppText style={styles.emptyText}>
                {filter === 'all'
                  ? 'Your RentalHub payments will appear here.'
                  : `You don’t have any ${filter} transactions.`}
              </AppText>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadPayments({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        renderItem={({ item }) => {
          const visual = statusVisual(item.payment_status);
          const completed = isCompletedPayment(item);
          return (
            <TouchableOpacity
              activeOpacity={completed ? 0.7 : 1}
              onPress={completed ? () => setSelectedReceipt(item) : undefined}
              style={styles.card}>
              <View style={[styles.paymentIcon, { backgroundColor: visual.background }]}>
                <Icon name={visual.icon} size={20} color={visual.color} />
              </View>
              <View style={styles.paymentBody}>
                <AppText style={styles.type}>{formatPaymentType(item.payment_type)}</AppText>
                <AppText style={styles.meta} numberOfLines={1}>
                  {item.property_title || item.payment_method || 'RentalHub transaction'}
                </AppText>
                <AppText style={styles.date}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </AppText>
                {item.transaction_reference ? (
                  <AppText style={styles.reference} numberOfLines={1}>
                    Ref: {item.transaction_reference}
                  </AppText>
                ) : null}
                {completed ? (
                  <AppText style={styles.viewReceipt}>Tap to view receipt</AppText>
                ) : null}
              </View>
              <View style={styles.paymentRight}>
                <AppText style={styles.amount}>{formatAmount(item.amount)}</AppText>
                <View style={[styles.statusPill, { backgroundColor: visual.background }]}>
                  <AppText style={[styles.statusText, { color: visual.color }]}>
                    {item.payment_status || 'unknown'}
                  </AppText>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={Boolean(selectedReceipt)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptSheet}>
            <View style={styles.receiptHeader}>
              <AppText style={styles.receiptEyebrow}>RECEIPT</AppText>
              <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {selectedReceipt ? (
              <>
                <View style={styles.receiptCard}>
                  <View style={styles.receiptBrand}>
                    <BrandMark compact />
                  </View>
                  <AppText style={styles.receiptNumber}>
                    #{String(selectedReceipt.id || '').padStart(6, '0')}
                  </AppText>
                  <AppText style={styles.receiptType}>
                    {formatPaymentType(selectedReceipt.payment_type)}
                  </AppText>
                  <AppText style={styles.receiptAmount}>
                    {formatAmount(selectedReceipt.amount)}
                  </AppText>

                  <View style={styles.receiptRow}>
                    <AppText style={styles.receiptLabel}>Date</AppText>
                    <AppText style={styles.receiptValue}>
                      {selectedReceipt.created_at ? new Date(selectedReceipt.created_at).toLocaleString() : '-'}
                    </AppText>
                  </View>
                  <View style={styles.receiptRow}>
                    <AppText style={styles.receiptLabel}>Reference</AppText>
                    <AppText style={styles.receiptValue}>
                      {selectedReceipt.transaction_reference || '-'}
                    </AppText>
                  </View>
                  <View style={styles.receiptRow}>
                    <AppText style={styles.receiptLabel}>Status</AppText>
                    <AppText style={styles.receiptValue}>{selectedReceipt.payment_status}</AppText>
                  </View>
                  <View style={styles.receiptRow}>
                    <AppText style={styles.receiptLabel}>Payment method</AppText>
                    <AppText style={styles.receiptValue}>
                      {selectedReceipt.payment_channel
                        ? `${selectedReceipt.payment_method || 'Paystack'} — ${humanizeChannel(selectedReceipt.payment_channel)}`
                        : selectedReceipt.payment_method || 'Paystack'}
                    </AppText>
                  </View>
                </View>

                <View style={styles.receiptActions}>
                  <TouchableOpacity
                    onPress={handleShareReceipt}
                    disabled={receiptBusy}
                    style={styles.receiptButton}>
                    {receiptBusy ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Icon name="share-social-outline" size={18} color={colors.white} />
                    )}
                    <AppText style={styles.receiptButtonText}>Share</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDownloadReceipt}
                    disabled={receiptBusy}
                    style={[styles.receiptButton, styles.receiptButtonSecondary]}>
                    <Icon name="download-outline" size={18} color={colors.blue} />
                    <AppText style={[styles.receiptButtonText, styles.receiptButtonTextSecondary]}>
                      Download PDF
                    </AppText>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.surface, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { alignItems: 'center', flex: 1 },
  headerSpacer: { width: 42 },
  eyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 2,
  },
  list: { padding: 16, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  summaryCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 20,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,201,40,0.14)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  summaryLabel: {
    color: '#AFC2DF',
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 16,
  },
  summaryAmount: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 32,
    letterSpacing: -1.25,
    marginTop: 3,
  },
  summaryMeta: {
    color: '#8FA8CA',
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 6,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  filterChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  filterText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.white,
    fontFamily: typography.semibold,
  },
  card: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 13,
  },
  paymentIcon: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  paymentBody: { flex: 1, marginLeft: 11 },
  type: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  meta: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  date: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 5,
  },
  reference: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  viewReceipt: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 12,
    marginTop: 5,
  },
  paymentRight: { alignItems: 'flex-end', marginLeft: 7 },
  amount: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: radius.pill,
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: typography.bold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 330,
    paddingHorizontal: 28,
  },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 12,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 17,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 26, 61, 0.55)',
  },
  receiptSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 28,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  receiptEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.25,
  },
  receiptCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 18,
  },
  receiptBrand: {
    marginBottom: 12,
  },
  receiptNumber: {
    color: colors.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  receiptType: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
    marginTop: 4,
  },
  receiptAmount: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 28,
    letterSpacing: -0.75,
    marginTop: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  receiptLabel: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  receiptValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  receiptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.blue,
    borderRadius: 14,
    paddingVertical: 14,
  },
  receiptButtonSecondary: {
    backgroundColor: colors.white,
    borderColor: colors.blue,
    borderWidth: 1,
  },
  receiptButtonText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  receiptButtonTextSecondary: {
    color: colors.blue,
  },
});

export default PaymentHistoryScreen;
