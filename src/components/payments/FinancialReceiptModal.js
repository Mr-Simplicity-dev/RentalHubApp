import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import { paymentService } from '../../services/paymentService';
import { colors, radius, typography, typeScale } from '../../theme';
import { getErrorMessage } from '../../utils/http';
import AppText from '../common/AppText';
import BrandMark from '../brand/BrandMark';

const FinancialReceiptModal = ({ visible, kind, recordId, onClose }) => {
  useInterfaceLanguage();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (!visible || !kind || !recordId) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    setReceipt(null);

    paymentService
      .getDocumentReceipt(kind, recordId)
      .then((res) => {
        if (!active) return;
        if (res?.success && res?.data) {
          setReceipt(res.data);
        } else {
          setError(res?.message || ui('Could not load receipt'));
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, ui('Could not load receipt')));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible, kind, recordId]);

  const savePdfToCache = async () => {
    const buffer = await paymentService.downloadDocumentPdf(kind, recordId);
    const safeName = String(receipt?.receiptNumber || `${kind}-${recordId}`)
      .replace(/[^A-Za-z0-9_-]/g, '-')
      .toLowerCase();
    const file = new File(Paths.cache, `${safeName}.pdf`);
    try {
      file.delete();
    } catch {
      // ignore if not present
    }
    file.create();
    file.write(new Uint8Array(buffer));
    return file;
  };

  const handleSharePdf = async () => {
    if (!kind || !recordId || busy) return;
    setBusy(true);
    try {
      const file = await savePdfToCache();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: ui('Receipt'),
        });
      } else {
        Toast.show({
          type: 'info',
          text1: ui('Receipt saved'),
          text2: file.uri,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: ui('Could not share receipt'),
        text2: getErrorMessage(err, ui('Please try again.')),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!kind || !recordId || busy) return;
    setBusy(true);
    try {
      const file = await savePdfToCache();
      Toast.show({
        type: 'success',
        text1: ui('Receipt saved'),
        text2: file.uri,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: ui('Could not download receipt'),
        text2: getErrorMessage(err, ui('Please try again.')),
      });
    } finally {
      setBusy(false);
    }
  };

  const totalLabelText = receipt?.totalLabel || ui('Amount');
  const shareLabel = ui('Share PDF');
  const downloadLabel = ui('Download PDF');
  const closeLabel = ui('Close');

  return (
    <Modal visible={Boolean(visible)} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.topBar}>
            <AppText style={styles.topBarTitle}>{ui('Receipt')}</AppText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel={closeLabel}>
              <Icon name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={colors.navy} />
                <AppText style={styles.loadingText}>{ui('Preparing receipt…')}</AppText>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            ) : receipt ? (
              <View>
                <View style={styles.brandBlock}>
                  <BrandMark size={40} />
                  <AppText style={styles.amanaScript}>Amana</AppText>
                  <AppText style={styles.brandTitle}>Amana RentalHub NG</AppText>
                  <AppText style={styles.brandSub}>rentalhub.com.ng • support@rentalhub.com.ng</AppText>
                  <AppText style={styles.docType}>{receipt.documentType}</AppText>
                  {receipt.subtitle ? <AppText style={styles.docSub}>{receipt.subtitle}</AppText> : null}
                  <AppText style={styles.receiptNumber}>{receipt.receiptNumber}</AppText>
                </View>

                <View style={styles.metaCard}>
                  <Row label={ui('Status')} value={receipt.status} />
                  {receipt.fullName ? <Row label={receipt.partyLabel || ui('Paid by')} value={receipt.fullName} /> : null}
                  {receipt.email ? <Row label={ui('Email')} value={receipt.email} /> : null}
                  {receipt.recipientName ? <Row label={ui('Recipient')} value={receipt.recipientName} /> : null}
                  {receipt.date ? <Row label={ui('Date')} value={receipt.date} /> : null}
                  {receipt.reference ? <Row label={ui('Reference')} value={receipt.reference} /> : null}
                  {receipt.methodLine ? <Row label={ui('Method')} value={receipt.methodLine} /> : null}
                  <Row label={ui('Currency')} value={receipt.currency || 'NGN'} />
                </View>

                {receipt.rent ? (
                  <View style={styles.sectionCard}>
                    {receipt.rent.paymentFor ? <Row label={ui('Payment For')} value={receipt.rent.paymentFor} /> : null}
                    {receipt.rent.propertyTitle ? <Row label={ui('Property')} value={receipt.rent.propertyTitle} /> : null}
                    {receipt.rent.propertyAddress ? <Row label={ui('Address')} value={receipt.rent.propertyAddress} /> : null}
                    {receipt.rent.tenantName ? <Row label={ui('Tenant')} value={receipt.rent.tenantName} /> : null}
                    {receipt.rent.landlordName ? <Row label={ui('Landlord')} value={receipt.rent.landlordName} /> : null}
                  </View>
                ) : null}

                {Array.isArray(receipt.contextRows) && receipt.contextRows.length > 0 ? (
                  <View style={styles.sectionCard}>
                    {receipt.contextRows.map((row, index) => (
                      <Row key={`${row.label}-${index}`} label={row.label} value={row.value} />
                    ))}
                  </View>
                ) : null}

                {receipt.payout ? (
                  <View style={styles.sectionCard}>
                    <Row label={ui('Withdrawal ID')} value={`#${receipt.payout.withdrawalId}`} />
                    {receipt.payout.bankName ? <Row label={ui('Bank')} value={receipt.payout.bankName} /> : null}
                    {receipt.payout.maskedAccountNumber ? (
                      <Row label={ui('Account Number')} value={receipt.payout.maskedAccountNumber} />
                    ) : null}
                    {receipt.payout.accountName ? <Row label={ui('Account Name')} value={receipt.payout.accountName} /> : null}
                  </View>
                ) : null}

                {receipt.refund ? (
                  <View style={styles.sectionCard}>
                    {receipt.refund.originalReceiptNumber ? (
                      <Row label={ui('Original Receipt')} value={receipt.refund.originalReceiptNumber} />
                    ) : null}
                    {receipt.refund.originalReference ? (
                      <Row label={ui('Original Reference')} value={receipt.refund.originalReference} />
                    ) : null}
                    <Row label={ui('Refund Type')} value={receipt.refund.refundTypeLabel} />
                    {receipt.refund.reason ? <Row label={ui('Reason')} value={receipt.refund.reason} /> : null}
                  </View>
                ) : null}

                {receipt.noticeBanner ? (
                  <View style={styles.noticeBox}>
                    <AppText style={styles.noticeText}>{receipt.noticeBanner}</AppText>
                  </View>
                ) : null}

                {Array.isArray(receipt.items) && receipt.items.length > 0 ? (
                  <View style={styles.itemsCard}>
                    {receipt.items.map((item, idx) => (
                      <Row key={`${item.label}-${idx}`} label={item.label} value={item.amount} />
                    ))}
                  </View>
                ) : null}

                <View style={styles.totalRow}>
                  <AppText style={styles.totalLabel}>{totalLabelText}</AppText>
                  <AppText style={styles.totalValue}>{receipt.total}</AppText>
                </View>

                <AppText style={styles.footerNotice}>
                  {ui('This is a computer-generated receipt and does not require a signature.')}
                </AppText>
              </View>
            ) : null}
          </ScrollView>

          {!loading && !error && receipt ? (
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={[styles.btnOutline, busy && styles.btnDisabled]}
                onPress={handleSharePdf}
                disabled={busy}
              >
                <Icon name="share-outline" size={16} color={colors.navy} />
                <AppText style={styles.btnOutlineText}>{shareLabel}</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, busy && styles.btnDisabled]}
                onPress={handleDownloadPdf}
                disabled={busy}
              >
                <Icon name="download-outline" size={16} color={colors.white} />
                <AppText style={styles.btnPrimaryText}>{downloadLabel}</AppText>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <AppText style={styles.rowLabel}>{label}</AppText>
    <AppText style={styles.rowValue}>{String(value || '—')}</AppText>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarTitle: {
    fontFamily: typography.semibold,
    fontSize: typeScale.md,
    color: colors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
    paddingBottom: 28,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: typeScale.sm,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#991B1B',
    fontSize: typeScale.sm,
  },
  brandBlock: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#0284C7',
    paddingBottom: 14,
    marginBottom: 14,
  },
  amanaScript: {
    marginTop: 6,
    fontSize: 22,
    fontStyle: 'italic',
    color: '#6E1B2B',
    fontFamily: typography.semibold,
  },
  brandTitle: {
    fontSize: 17,
    fontFamily: typography.bold,
    color: colors.ink,
  },
  brandSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  docType: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: typography.bold,
    color: colors.ink,
    letterSpacing: 0.6,
  },
  docSub: {
    marginTop: 2,
    fontSize: 11,
    color: colors.muted,
  },
  receiptNumber: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: typography.bold,
    color: '#0284C7',
  },
  metaCard: {
    gap: 8,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemsCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: 12,
    color: colors.muted,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 12,
    fontFamily: typography.semibold,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
  },
  noticeBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 12,
  },
  noticeText: {
    color: '#991B1B',
    fontSize: 12,
    fontFamily: typography.medium,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: colors.ink,
  },
  totalValue: {
    fontSize: 17,
    fontFamily: typography.bold,
    color: '#0284C7',
  },
  footerNotice: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 11,
    color: colors.muted,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 11,
    backgroundColor: colors.white,
  },
  btnOutlineText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: colors.navy,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: 11,
    backgroundColor: colors.navy,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontFamily: typography.semibold,
    color: colors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default FinancialReceiptModal;
