import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
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
import { colors, radius, typography, typeScale } from '../../theme';
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
  const interfaceLanguage = useInterfaceLanguage();
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
  const [receiptData, setReceiptData] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, interfaceLanguage]);

  const loadPayments = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await paymentService.getPaymentHistory({ limit: 50 });
      setPayments(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not load payments"),
        text2: getErrorMessage(error, ui("Please try again.")),
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
    [payments, interfaceLanguage]
  );
  const completedTotal = useMemo(
    () => completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [completedPayments, interfaceLanguage]
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
    [filter, payments, interfaceLanguage]
  );

  const isCompletedPayment = (payment) =>
    ['completed', 'successful', 'success'].includes(payment.payment_status);

  const openReceipt = async (payment) => {
    setSelectedReceipt(payment);
    setReceiptData(null);
    setReceiptLoading(true);
    try {
      const response = await paymentService.getReceiptData(payment.id);
      setReceiptData(response?.data || null);
    } catch (error) {
      setReceiptData(null);
    } finally {
      setReceiptLoading(false);
    }
  };

  const closeReceipt = () => {
    setSelectedReceipt(null);
    setReceiptData(null);
    setReceiptLoading(false);
  };

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
          dialogTitle: ui("Receipt"),
        });
      } else {
        Toast.show({ type: 'info', text1: ui("Saved"), text2: ui("Receipt saved to {value0}", {value0: (file.uri)}) });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: ui("Could not share receipt"), text2: getErrorMessage(error, ui("Please try again.")) });
    } finally {
      setReceiptBusy(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!selectedReceipt) return;
    setReceiptBusy(true);
    try {
      const file = await saveReceiptPdf(selectedReceipt);
      Toast.show({ type: 'success', text1: ui("Receipt saved"), text2: ui("Saved to {value0}", {value0: (file.uri)}) });
    } catch (error) {
      Toast.show({ type: 'error', text1: ui("Could not download receipt"), text2: getErrorMessage(error, ui("Please try again.")) });
    } finally {
      setReceiptBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View {...paymentTourTarget} style={styles.header}>
        <TouchableOpacity
          accessibilityLabel={ui("Go back")}
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>{ui("TRANSACTIONS")}</AppText>
          <AppText style={styles.title}>{ui("Payment history")}</AppText>
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
              <AppText style={styles.summaryLabel}>{ui("Completed transaction value")}</AppText>
              <AppText style={styles.summaryAmount}>{formatAmount(completedTotal)}</AppText>
              <AppText style={styles.summaryMeta}>
                {completedPayments.length}{ui(" completed · ")}{payments.length}{ui("total transactions")}</AppText>
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
              <AppText style={styles.loadingText}>{ui("Loading transactions…")}</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Icon name="receipt-outline" size={31} color={colors.blue} />
              </View>
              <AppText style={styles.emptyTitle}>{ui("No transactions here")}</AppText>
              <AppText style={styles.emptyText}>
                {filter === "all"
                  ? ui('Your RentalHub payments will appear here.')
                  : ui("You don’t have any {value0} transactions.", {value0: (filter)})}
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
              onPress={completed ? () => openReceipt(item) : undefined}
              style={styles.card}>
              <View style={[styles.paymentIcon, { backgroundColor: visual.background }]}>
                <Icon name={visual.icon} size={20} color={visual.color} />
              </View>
              <View style={styles.paymentBody}>
                <AppText style={styles.type}>{formatPaymentType(item.payment_type)}</AppText>
                <AppText style={styles.meta} numberOfLines={1}>
                  {item.property_title || item.payment_method || ui('RentalHub transaction')}
                </AppText>
                <AppText style={styles.date}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </AppText>
                {item.transaction_reference ? (
                  <AppText style={styles.reference} numberOfLines={1}>{ui("Ref:")}{item.transaction_reference}
                  </AppText>
                ) : null}
                {completed ? (
                  <AppText style={styles.viewReceipt}>{ui("Tap to view receipt")}</AppText>
                ) : null}
              </View>
              <View style={styles.paymentRight}>
                <AppText style={styles.amount}>{formatAmount(item.amount)}</AppText>
                <View style={[styles.statusPill, { backgroundColor: visual.background }]}>
                  <AppText style={[styles.statusText, { color: visual.color }]}>
                    {item.payment_status || ui("unknown")}
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
        onRequestClose={closeReceipt}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptSheet}>
            <View style={styles.receiptHeader}>
              <AppText style={styles.receiptEyebrow}>{ui("RECEIPT")}</AppText>
              <TouchableOpacity onPress={closeReceipt}>
                <Icon name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {selectedReceipt ? (
              <>
                <View style={styles.receiptCard}>
                  <View style={styles.receiptBrand}>
                    <BrandMark compact />
                  </View>

                  {receiptLoading ? (
                    <View style={styles.receiptLoading}>
                      <ActivityIndicator color={colors.blue} size="small" />
                      <AppText style={styles.receiptLoadingText}>{ui("Preparing receipt…")}</AppText>
                    </View>
                  ) : (
                    <>
                      <AppText style={styles.receiptNumber}>
                        {receiptData?.receiptNumber
                          || ui("ARH-RCPT-{value0}", {value0: (String(selectedReceipt.id || 0).padStart(6, '0'))})}
                      </AppText>
                      <AppText style={styles.receiptDocType}>
                        {receiptData?.documentType || ui('OFFICIAL PAYMENT RECEIPT')}
                      </AppText>
                      <AppText style={styles.receiptType}>
                        {formatPaymentType(selectedReceipt.payment_type)}
                      </AppText>
                      <AppText style={styles.receiptAmount}>
                        {receiptData?.total || formatAmount(selectedReceipt.amount)}
                      </AppText>

                      <View style={styles.receiptRow}>
                        <AppText style={styles.receiptLabel}>{ui("Date")}</AppText>
                        <AppText style={styles.receiptValue}>
                          {receiptData?.date
                            || (selectedReceipt.created_at
                              ? new Date(selectedReceipt.created_at).toLocaleString()
                              : '-')}
                        </AppText>
                      </View>
                      <View style={styles.receiptRow}>
                        <AppText style={styles.receiptLabel}>{ui("Reference")}</AppText>
                        <AppText style={styles.receiptValue}>
                          {receiptData?.reference || selectedReceipt.transaction_reference || '-'}
                        </AppText>
                      </View>
                      <View style={styles.receiptRow}>
                        <AppText style={styles.receiptLabel}>{ui("Status")}</AppText>
                        <AppText style={[styles.receiptValue, styles.receiptStatus]}>
                          {receiptData?.status || selectedReceipt.payment_status}
                        </AppText>
                      </View>
                      <View style={styles.receiptRow}>
                        <AppText style={styles.receiptLabel}>{ui("Payment method")}</AppText>
                        <AppText style={styles.receiptValue}>
                          {receiptData?.methodLine
                            || (selectedReceipt.payment_channel
                              ? ui("{value0} — {value1}", {value0: (selectedReceipt.payment_method || 'Paystack'), value1: (humanizeChannel(selectedReceipt.payment_channel))})
                              : selectedReceipt.payment_method || 'Paystack')}
                        </AppText>
                      </View>
                      {receiptData?.currency ? (
                        <View style={styles.receiptRow}>
                          <AppText style={styles.receiptLabel}>{ui("Currency")}</AppText>
                          <AppText style={styles.receiptValue}>{receiptData.currency}</AppText>
                        </View>
                      ) : null}

                      {receiptData?.rent ? (
                        <View style={styles.receiptBlock}>
                          {[
                            ['Payment For', receiptData.rent.paymentFor],
                            ['Property', receiptData.rent.propertyTitle],
                            ['Property Address', receiptData.rent.propertyAddress],
                            ['Tenant', receiptData.rent.tenantName],
                            ['Landlord', receiptData.rent.landlordName],
                            [
                              'Rental Period',
                              receiptData.rent.rentalPeriod
                                ? receiptData.rent.rentalPeriod.end
                                  ? `${receiptData.rent.rentalPeriod.start} - ${receiptData.rent.rentalPeriod.end}`
                                  : receiptData.rent.rentalPeriod.start
                                : null,
                            ],
                          ]
                            .filter(([, value]) => value)
                            .map(([label, value]) => (
                              <View key={label} style={styles.receiptRow}>
                                <AppText style={styles.receiptLabel}>{label}</AppText>
                                <AppText style={styles.receiptValue}>{value}</AppText>
                              </View>
                            ))}
                        </View>
                      ) : null}

                      {receiptData?.items?.length ? (
                        <View style={styles.receiptBlock}>
                          {receiptData.items.map((item, index) => (
                            <View key={`${item.label}-${index}`} style={styles.receiptRow}>
                              <AppText style={styles.receiptLabel}>{item.label}</AppText>
                              <AppText style={styles.receiptValue}>{item.amount}</AppText>
                            </View>
                          ))}
                          <View style={[styles.receiptRow, styles.receiptTotalRow]}>
                            <AppText style={styles.receiptTotalLabel}>{ui("Total Paid")}</AppText>
                            <AppText style={styles.receiptTotalAmount}>{receiptData.total}</AppText>
                          </View>
                        </View>
                      ) : null}

                      {Number(receiptData?.rent?.platformFee) > 0 ? (
                        <AppText style={styles.receiptFeeNote}>
                          {ui("Platform/Service Fee: ₦{value0} (deducted from the landlord's payout - not charged to you)", {value0: (Number(receiptData.rent.platformFee).toLocaleString())})}
                        </AppText>
                      ) : null}

                      <AppText style={styles.receiptNotice}>{ui("This is a computer-generated receipt and does not require a signature.")}</AppText>
                    </>
                  )}
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
                    <AppText style={styles.receiptButtonText}>{ui("Share")}</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDownloadReceipt}
                    disabled={receiptBusy}
                    style={[styles.receiptButton, styles.receiptButtonSecondary]}>
                    <Icon name="download-outline" size={18} color={colors.blue} />
                    <AppText style={[styles.receiptButtonText, styles.receiptButtonTextSecondary]}>{ui("Download PDF")}</AppText>
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 16,
  },
  summaryAmount: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: typeScale.hero,
    lineHeight: 40,
    letterSpacing: -0.3,
    marginTop: 3,
  },
  summaryMeta: {
    color: '#8FA8CA',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  meta: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 4,
  },
  date: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 5,
  },
  reference: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
  viewReceipt: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 5,
  },
  paymentRight: { alignItems: 'flex-end', marginLeft: 7 },
  amount: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  statusPill: {
    borderRadius: radius.pill,
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    marginTop: 17,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  receiptType: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
    marginTop: 4,
  },
  receiptAmount: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.xxl,
    lineHeight: 36,
    letterSpacing: -0.3,
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
    fontSize: typeScale.xs,
    lineHeight: 18,
  },
  receiptValue: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  receiptDocType: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.75,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  receiptStatus: {
    color: colors.success,
  },
  receiptLoading: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  receiptLoadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 10,
  },
  receiptBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 4,
  },
  receiptTotalRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  receiptTotalLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  receiptTotalAmount: {
    color: colors.blue,
    flex: 1,
    fontFamily: typography.bold,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginLeft: 12,
    textAlign: 'right',
  },
  receiptFeeNote: {
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.sm,
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  receiptNotice: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.reading,
    lineHeight: 22,
    marginTop: 14,
    textAlign: 'center',
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
    fontFamily: typography.semibold,
    fontSize: typeScale.sm,
    lineHeight: 20,
  },
  receiptButtonTextSecondary: {
    color: colors.blue,
  },
});

export default PaymentHistoryScreen;
