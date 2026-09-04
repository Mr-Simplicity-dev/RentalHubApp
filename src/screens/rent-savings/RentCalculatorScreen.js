import React, { useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  formatNaira,
} from '../../components/common/PremiumLayout';
import { AuthContext } from '../../context/AuthContext';
import { rentCalculatorService } from '../../services/rentCalculatorService';
import { getErrorMessage } from '../../utils/http';
import { colors, radius, shadows, typography } from '../../theme';
import AppText from '../../components/common/AppText';

const numOrEmpty = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : '';
};

const RentCalculatorScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const params = route?.params || {};

  const [rentAmount, setRentAmount] = useState(numOrEmpty(params.rent_amount));
  const [frequency, setFrequency] = useState(params.payment_frequency === 'monthly' ? 'monthly' : 'yearly');
  const [upfrontMonths, setUpfrontMonths] = useState(numOrEmpty(params.upfront_months));
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [ratioPct, setRatioPct] = useState('33');
  const [monthsToGoal, setMonthsToGoal] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canCalculate = useMemo(() => {
    const rent = Number(rentAmount);
    return Number.isFinite(rent) && rent > 0;
  }, [rentAmount]);

  const calculate = async () => {
    if (!canCalculate) {
      setError('Enter the rent amount first.');
      setResult(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await rentCalculatorService.estimate({
        rent_amount: Number(rentAmount),
        payment_frequency: frequency,
        upfront_months: upfrontMonths ? Number(upfrontMonths) : undefined,
        monthly_income: monthlyIncome ? Number(monthlyIncome) : undefined,
        ratio_pct: ratioPct ? Number(ratioPct) : undefined,
        months_to_goal: monthsToGoal ? Number(monthsToGoal) : undefined,
      });
      if (response?.success) {
        setResult(response.data);
      } else {
        setError(response?.message || 'Could not calculate.');
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(err, 'Could not run the rent calculator'),
      });
      setError(getErrorMessage(err, 'Could not run the rent calculator'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canCalculate) calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const afford = result?.affordability?.enabled ? result.affordability : null;
  const withinBudget = afford?.monthly_equivalent_within_budget;

  const feeRows = result
    ? [
        { label: `Rent (${result.upfront_months} months upfront)`, value: formatNaira(result.rent_due_at_move_in) },
        { label: 'Agent fee', value: formatNaira(result.fees.agent_fee) },
        { label: 'Legal fee', value: formatNaira(result.fees.legal_fee) },
        { label: 'Caution deposit', value: formatNaira(result.fees.caution_deposit) },
        { label: 'Agreement / stamp fee', value: formatNaira(result.fees.agreement_fee) },
      ]
    : [];

  if (Number(result?.fees?.service_charge || 0) > 0) {
    feeRows.push({ label: 'Service charge', value: formatNaira(result.fees.service_charge) });
  }

  return (
    <PremiumScreen>
      <PremiumHero
        eyebrow="Rent calculator"
        title="Understand your monthly rent"
        subtitle="See the monthly cost, the full move-in total, and the monthly savings you would need."
        icon="calculator-outline"
      />

      <PremiumSectionTitle
        title="Rent details"
        subtitle="What the landlord is asking"
      />

      <PremiumCard>
        <Input
          label="Rent amount (₦)"
          value={rentAmount}
          onChangeText={setRentAmount}
          placeholder="e.g. 1200000"
          icon="cash-outline"
          keyboardType="numeric"
        />

        <AppText style={styles.fieldLabel}>This rent is per</AppText>
        <View style={styles.freqRow}>
          {['yearly', 'monthly'].map((freq) => (
            <TouchableOpacity
              key={freq}
              activeOpacity={0.85}
              onPress={() => setFrequency(freq)}
              style={[styles.freqButton, frequency === freq && styles.freqButtonActive]}
            >
              <AppText style={[styles.freqText, frequency === freq && styles.freqTextActive]}>
                {freq === 'yearly' ? 'Per year' : 'Per month'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Rent due upfront (months)"
          value={upfrontMonths || (frequency === 'yearly' ? '12' : '1')}
          onChangeText={setUpfrontMonths}
          placeholder="e.g. 12"
          icon="calendar-outline"
          keyboardType="numeric"
        />

        <Input
          label="Your monthly income (₦) — optional"
          value={monthlyIncome}
          onChangeText={setMonthlyIncome}
          placeholder="e.g. 400000"
          icon="wallet-outline"
          keyboardType="numeric"
        />

        {monthlyIncome ? (
          <Input
            label="Share of income for rent (%)"
            value={ratioPct}
            onChangeText={setRatioPct}
            placeholder="33"
            icon="percent-outline"
            keyboardType="numeric"
          />
        ) : null}

        <Input
          label="Months until rent is due — optional"
          value={monthsToGoal}
          onChangeText={setMonthsToGoal}
          placeholder="e.g. 12"
          icon="time-outline"
          keyboardType="numeric"
        />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <PremiumButton
          title="Calculate rent"
          onPress={calculate}
          loading={loading}
          icon="calculator-outline"
          style={styles.submitBtn}
        />
      </PremiumCard>

      {result ? (
        <View style={styles.results}>
          <View style={styles.heroCard}>
            <AppText style={styles.heroEyebrow}>
              {result.frequency === 'yearly' ? 'Monthly equivalent of your yearly rent' : 'Monthly rent'}
            </AppText>
            <AppText style={styles.heroValue}>{formatNaira(result.monthly_equivalent)}</AppText>
            <AppText style={styles.heroCaption}>
              {result.upfront_months} month(s) upfront = {formatNaira(result.rent_due_at_move_in)} of rent alone
            </AppText>
          </View>

          {afford ? (
            <PremiumCard style={withinBudget ? styles.budgetGood : styles.budgetWarn}>
              <AppText style={styles.budgetTitle}>
                {withinBudget ? 'Fits your income budget' : 'Above your income budget'}
              </AppText>
              <AppText style={styles.budgetText}>
                At {afford.ratio_pct}% of {formatNaira(afford.monthly_income)}/month, you can put{' '}
                {formatNaira(afford.affordable_monthly)} toward rent monthly (~{formatNaira(afford.affordable_annual_rent)}/year).
              </AppText>
            </PremiumCard>
          ) : null}

          <PremiumCard>
            <PremiumSectionTitle
              title="Money needed on day one"
              subtitle="Rent plus the usual Nigerian fees"
            />
            {feeRows.map((row) => (
              <InfoRow key={row.label} label={row.label} value={row.value} />
            ))}
            <View style={styles.totalRow}>
              <AppText style={styles.totalLabel}>Move-in total</AppText>
              <AppText style={styles.totalValue}>{formatNaira(result.move_in_total)}</AppText>
            </View>
          </PremiumCard>

          {result.savings?.enabled ? (
            <View style={styles.savingsCard}>
              <AppText style={styles.savingsEyebrow}>Rent Savings top-up</AppText>
              <AppText style={styles.savingsValue}>{formatNaira(result.savings.monthly_savings_required)}/month</AppText>
              <AppText style={styles.savingsText}>
                Saving this monthly for {result.savings.months_to_goal} months covers the full{' '}
                {formatNaira(result.move_in_total)}.
              </AppText>
            </View>
          ) : null}

          {user?.user_type === 'tenant' ? (
            <PremiumCard style={styles.planCtaCard}>
              <AppText style={styles.planCtaTitle}>Ready to start saving?</AppText>
              <AppText style={styles.planCtaText}>
                Pick an approved property and a due date to begin a monthly Rent Savings plan.
              </AppText>
              <PremiumButton
                title="Start a rent savings plan"
                onPress={() => navigation.navigate('SavingsGoalCreate')}
                icon="wallet-outline"
              />
            </PremiumCard>
          ) : null}
        </View>
      ) : null}
    </PremiumScreen>
  );
};

const styles = StyleSheet.create({
  fieldLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 8,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  freqButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  freqButtonActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  freqText: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  freqTextActive: {
    color: colors.white,
  },
  submitBtn: {
    marginTop: 10,
  },
  error: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: 8,
  },
  results: {
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: 22,
    marginBottom: 14,
    ...shadows.soft,
  },
  heroEyebrow: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 36,
    marginTop: 6,
  },
  heroCaption: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  budgetGood: {
    backgroundColor: '#E9F9EF',
    borderColor: '#BFE9D2',
  },
  budgetWarn: {
    backgroundColor: '#FFF6E5',
    borderColor: '#F4DFAF',
  },
  budgetTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  budgetText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 15,
  },
  totalValue: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  savingsCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: 22,
    marginBottom: 14,
    ...shadows.soft,
  },
  savingsEyebrow: {
    color: colors.gold,
    fontFamily: typography.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  savingsValue: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 30,
    marginTop: 6,
  },
  savingsText: {
    color: '#B9C9E5',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  planCtaCard: {
    marginBottom: 14,
  },
  planCtaTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  planCtaText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 12,
  },
});

export default RentCalculatorScreen;
