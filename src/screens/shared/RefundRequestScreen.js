import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { tenancyAdjustmentService } from '../../services/tenancyAdjustmentService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, radius, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const formatNaira = (value) => `₦${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

const CATEGORIES = [
  { key: 'standard', label: 'Standard refund', icon: 'cash-outline', hint: 'Overpayment or an error on your completed rent payment.' },
  { key: 'relocation', label: 'Relocation (moving out early)', icon: 'airplane-outline', hint: 'You are moving out before your paid rent period ends.' },
];

const RefundRequestScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [category, setCategory] = useState(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [moveOutDate, setMoveOutDate] = useState('');
  const [dueDays, setDueDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await tenancyAdjustmentService.getEligibleRefundPayments();
        if (active) setPayments(pickList(response, ['data']));
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: getErrorMessage(err, 'Could not load eligible payments'),
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const selectedPayment = payments.find((p) => String(p.payment_id) === String(selectedPaymentId));

  const validate = () => {
    if (!selectedPaymentId) {
      setError('Select the rent payment you want refunded.');
      return false;
    }
    if (!category) {
      setError('Choose the refund type.');
      return false;
    }
    if (!reason.trim()) {
      setError('Please provide a reason.');
      return false;
    }
    if (category === 'relocation') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(moveOutDate)) {
        setError('Enter your move-out date as YYYY-MM-DD.');
        return false;
      }
      const days = Number(dueDays);
      if (!Number.isFinite(days) || days < 1) {
        setError('Enter how many days you are giving the landlord to refund you.');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const isRelocation = category === 'relocation';
      const body = {
        payment_id: Number(selectedPaymentId),
        reason: reason.trim(),
        details: details.trim() || undefined,
      };
      if (isRelocation) {
        body.request_category = 'early_exit_refund';
        body.requested_move_out_date = moveOutDate;
        body.refund_due_days = Number(dueDays);
      }
      const response = await tenancyAdjustmentService.submitRefundRequest(body);
      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: 'Refund request submitted',
          text2: response.message,
        });
        navigation.goBack();
      } else {
        setError(response?.message || 'Could not submit the refund request.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit the refund request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(selectedPaymentId) && Boolean(category) && reason.trim().length > 0;

  if (loading) {
    return <PremiumCenter loading title="Checking your payments" />;
  }

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow="Tenancy"
        title="Request a rent refund"
        subtitle="Ask for a refund on a completed rent payment — standard or relocation (early exit)."
        icon="cash-outline"
      />

      {payments.length === 0 ? (
        <PremiumCard>
          <AppText style={styles.note}>
            You have no completed rent payments eligible for a refund right now.
          </AppText>
        </PremiumCard>
      ) : (
        <>
          <PremiumSectionTitle
            title="Rent payment"
            subtitle="Choose the completed rent payment this request is about."
          />
          {payments.map((payment) => {
            const selected = String(payment.payment_id) === String(selectedPaymentId);
            return (
              <TouchableOpacity
                key={payment.payment_id}
                activeOpacity={0.86}
                onPress={() => setSelectedPaymentId(payment.payment_id)}
              >
                <PremiumCard style={[styles.paymentCard, selected && styles.paymentCardSelected]}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentCopy}>
                      <AppText style={styles.paymentTitle}>{payment.property_title || 'Rental property'}</AppText>
                      <AppText style={styles.paymentMeta}>
                        {[payment.property_address, payment.landlord_name].filter(Boolean).join(' · ') || 'Rental payment'}
                      </AppText>
                    </View>
                    {selected ? <StatusPill label="Selected" color={colors.blue} /> : null}
                  </View>
                  <AppText style={styles.paymentAmount}>{formatNaira(payment.amount)}</AppText>
                  <AppText style={styles.paymentDate}>Paid {formatDate(payment.paid_at)}</AppText>
                </PremiumCard>
              </TouchableOpacity>
            );
          })}

          <PremiumSectionTitle title="Refund type" />
          {CATEGORIES.map((option) => {
            const selected = category === option.key;
            return (
              <TouchableOpacity key={option.key} activeOpacity={0.86} onPress={() => setCategory(option.key)}>
                <PremiumCard style={[styles.categoryCard, selected && styles.categoryCardSelected]}>
                  <AppText style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>{option.label}</AppText>
                  <AppText style={[styles.categoryHint, selected && styles.categoryHintSelected]}>{option.hint}</AppText>
                </PremiumCard>
              </TouchableOpacity>
            );
          })}

          <PremiumCard>
            <Input
              label="Reason"
              value={reason}
              onChangeText={setReason}
              placeholder="Explain why you are requesting this refund"
              multiline
              numberOfLines={3}
            />
            <Input
              label="Details (optional)"
              value={details}
              onChangeText={setDetails}
              placeholder="Any supporting context"
              multiline
              numberOfLines={2}
              containerStyle={styles.fieldGap}
            />

            {category === 'relocation' ? (
              <>
                <Input
                  label="Move-out date (YYYY-MM-DD)"
                  value={moveOutDate}
                  onChangeText={setMoveOutDate}
                  placeholder="e.g. 2026-12-15"
                  containerStyle={styles.fieldGap}
                />
                <Input
                  label="Days you will wait for the refund"
                  value={dueDays}
                  onChangeText={setDueDays}
                  placeholder="e.g. 30"
                  keyboardType="numeric"
                  containerStyle={styles.fieldGap}
                />
              </>
            ) : null}

            {error ? <AppText style={styles.error}>{error}</AppText> : null}

            <PremiumButton
              title="Submit refund request"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
              icon="send-outline"
              style={styles.submitBtn}
            />
          </PremiumCard>
        </>
      )}
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  paymentCard: {
    marginBottom: 10,
  },
  paymentCardSelected: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  paymentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  paymentCopy: {
    flex: 1,
  },
  paymentTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  paymentMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  paymentAmount: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 8,
  },
  paymentDate: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  categoryCard: {
    marginBottom: 8,
    borderWidth: 1,
  },
  categoryCardSelected: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.blue,
  },
  categoryLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  categoryLabelSelected: {
    color: colors.blue,
  },
  categoryHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  categoryHintSelected: {
    color: colors.text,
  },
  fieldGap: {
    marginTop: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 10,
  },
  submitBtn: {
    marginTop: 14,
  },
  note: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default RefundRequestScreen;
