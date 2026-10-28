import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { paymentService } from '../../services/paymentService';
import { recoverPayment, savePendingPayment } from '../../services/paymentRecoveryService';
import useNativePaystackCheckout from '../../hooks/useNativePaystackCheckout';
import { hasPaystackCheckout } from '../../services/nativePaymentService';
import { colors, radius, shadows, typography, typeScale } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

import AppText from '../../components/common/AppText';
const SubscribeScreen = ({ navigation }) => {
  const interfaceLanguage = useInterfaceLanguage();
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const { openNativeCheckout, NativePaystackCheckoutModal } = useNativePaystackCheckout();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, interfaceLanguage]);

  const loadSubscriptionData = async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [plansResponse, statusResponse] = await Promise.all([
        paymentService.getSubscriptionPlans(),
        paymentService.getSubscriptionStatus(),
      ]);
      setPlans(pickList(plansResponse, ['data', 'plans']));
      setStatus(pickObject(statusResponse, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Could not load subscriptions"),
        text2: getErrorMessage(error, ui("Please try again.")),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
    const unsubscribe = navigation.addListener('focus', () =>
      loadSubscriptionData({ refresh: true })
    );
    return unsubscribe;
  }, [navigation]);

  const subscribe = async (planId) => {
    setLoadingId(planId);
    try {
      const response = await paymentService.initializeSubscription(planId, 'paystack');
      const reference = response?.data?.reference;
      if (reference) {
        await savePendingPayment({
          flow: 'subscription',
          reference,
          planId,
        });
      }
      if (hasPaystackCheckout(response?.data)) {
        const selectedPlan = plans.find((plan) => String(plan.id) === String(planId));
        openNativeCheckout({
          transaction: response.data,
          title: ui("Pay subscription"),
          subtitle: ui("Complete your membership payment securely in the app."),
          amountLabel: selectedPlan?.amount ? ui("₦{value0}", {value0: (Number(selectedPlan.amount).toLocaleString())}) : '',
          onSuccess: (paymentResponse) =>
            completeSubscriptionPayment(paymentResponse?.reference || reference),
          onBrowserFallback: () => {
            Toast.show({
              type: 'info',
              text1: ui("Paystack checkout opened"),
              text2: ui("Complete payment securely, then return to RentalHub."),
            });
          },
        });
      } else if (reference) {
        await completeSubscriptionPayment(reference);
      } else {
        Toast.show({
          type: 'success',
          text1: ui("Subscription initialized"),
          text2: ui("Refresh this page to confirm activation."),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Subscription failed"),
        text2: getErrorMessage(error, 'Could not initialize subscription'),
      });
    } finally {
      setLoadingId(null);
    }
  };

  const completeSubscriptionPayment = async (reference) => {
    if (!reference) return;

    try {
      const response = await recoverPayment({
        reference,
        fallbackFlow: 'subscription',
      });
      if (response?.success) {
        Toast.show({ type: 'success', text1: ui("Subscription activated") });
        await loadSubscriptionData({ refresh: true });
      } else {
        Toast.show({
          type: 'error',
          text1: ui("Verification failed"),
          text2: response?.message || ui("Could not verify subscription payment."),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Verification failed"),
        text2: getErrorMessage(error, ui("Could not verify subscription payment.")),
      });
    }
  };

  const expiry = status?.subscription_expires_at || status?.expires_at;
  const activePlanName = status?.plan_name || status?.subscription_plan_name;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel={ui("Go back")}
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <AppText style={styles.eyebrow}>{ui("MEMBERSHIP")}</AppText>
          <AppText style={styles.title}>{ui("Subscription")}</AppText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.blue]}
            onRefresh={() => loadSubscriptionData({ refresh: true })}
            refreshing={refreshing}
            tintColor={colors.blue}
          />
        }
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} size="large" />
            <AppText style={styles.loadingText}>{ui("Loading membership options…")}</AppText>
          </View>
        ) : (
          <>
            <View style={[styles.statusCard, status?.subscription_active && styles.statusCardActive]}>
              <View style={styles.statusIcon}>
                <Icon
                  name={status?.subscription_active ? 'checkmark-circle' : 'sparkles'}
                  size={23}
                  color={colors.gold}
                />
              </View>
              <AppText style={styles.statusEyebrow}>
                {status?.subscription_active ? ui('ACTIVE MEMBERSHIP') : ui('PREMIUM ACCESS')}
              </AppText>
              <AppText style={styles.statusTitle}>
                {status?.subscription_active
                  ? activePlanName || ui('Your subscription is active')
                  : ui('Unlock the complete rental experience')}
              </AppText>
              <AppText style={styles.statusText}>
                {status?.subscription_active
                  ? expiry
                    ? ui("Your access remains active until {value0}.", {value0: (new Date(expiry).toLocaleDateString())})
                    : ui('Your premium RentalHub access is currently active.')
                  : ui('View full property details, verified contacts and premium tenant tools.')}
              </AppText>
            </View>

            <View style={styles.benefits}>
              {[
                ['lock-open-outline', 'Full property information'],
                ['person-outline', 'Verified landlord contacts'],
                ['shield-checkmark-outline', 'Safer rental workflow'],
              ].map(([icon, label]) => (
                <View key={label} style={styles.benefit}>
                  <View style={styles.benefitIcon}>
                    <Icon name={icon} size={18} color={colors.blue} />
                  </View>
                  <AppText style={styles.benefitText}>{label}</AppText>
                </View>
              ))}
            </View>

            <View style={styles.sectionHeading}>
              <AppText style={styles.sectionEyebrow}>{ui("CHOOSE YOUR ACCESS")}</AppText>
              <AppText style={styles.sectionTitle}>{ui("Available plans")}</AppText>
            </View>

            {plans.map((plan, index) => {
              const features = Array.isArray(plan.features)
                ? plan.features
                : typeof plan.features === 'string'
                  ? plan.features.split(',').map((value) => value.trim()).filter(Boolean)
                  : [];
              return (
                <View key={plan.id} style={[styles.planCard, index === 0 && styles.planCardFeatured]}>
                  {index === 0 ? (
                    <View style={styles.recommendedPill}>
                      <AppText style={styles.recommendedText}>{ui("RECOMMENDED")}</AppText>
                    </View>
                  ) : null}
                  <AppText style={styles.planName}>{plan.name || ui('RentalHub membership')}</AppText>
                  <View style={styles.priceRow}>
                    <AppText style={styles.planPrice}>₦{Number(plan.amount || 0).toLocaleString()}</AppText>
                    {plan.duration_days ? (
                      <AppText style={styles.duration}> / {plan.duration_days}{ui(" days")}</AppText>
                    ) : null}
                  </View>
                  <AppText style={styles.planDesc}>
                    {plan.description || ui('Premium tenant access and complete property information.')}
                  </AppText>
                  {(features.length ? features : ['Full property details', 'Verified contact access']).map(
                    (feature) => (
                      <View key={String(feature)} style={styles.featureRow}>
                        <Icon name="checkmark-circle" size={17} color={colors.success} />
                        <AppText style={styles.featureText}>{String(feature)}</AppText>
                      </View>
                    )
                  )}
                  <Button
                    disabled={status?.subscription_active && String(status?.plan_id) === String(plan.id)}
                    loading={loadingId === plan.id}
                    onPress={() => subscribe(plan.id)}
                    size="lg"
                    style={styles.button}
                    title={
                      status?.subscription_active && String(status?.plan_id) === String(plan.id)
                        ? 'Current plan'
                        : 'Choose this plan'
                    }
                  />
                </View>
              );
            })}

            {!plans.length ? (
              <View style={styles.emptyCard}>
                <Icon name="time-outline" size={26} color={colors.blue} />
                <AppText style={styles.emptyTitle}>{ui("Plans are being updated")}</AppText>
                <AppText style={styles.emptyText}>{ui("Please check again shortly.")}</AppText>
              </View>
            ) : null}

            <View style={styles.safetyRow}>
              <Icon name="shield-checkmark-outline" size={17} color={colors.success} />
              <AppText style={styles.safetyText}>{ui("Secure payment processing powered by Paystack")}</AppText>
            </View>
          </>
        )}
      </ScrollView>
      {NativePaystackCheckoutModal}
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
  content: { padding: 18, paddingBottom: 32 },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 480 },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 12,
  },
  statusCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: 21,
  },
  statusCardActive: { backgroundColor: '#073B35' },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,201,40,0.14)',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  statusEyebrow: {
    color: '#9BC3F4',
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
    marginTop: 17,
  },
  statusTitle: {
    color: colors.white,
    fontFamily: typography.semibold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginTop: 5,
  },
  statusText: {
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
  },
  benefits: { flexDirection: 'row', gap: 8, marginTop: 13 },
  benefit: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 100,
    padding: 10,
  },
  benefitIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  benefitText: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionHeading: { marginBottom: 13, marginTop: 28 },
  sectionEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: typeScale.lg,
    lineHeight: 28,
    marginTop: 4,
  },
  planCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 13,
    padding: 19,
    ...shadows.soft,
  },
  planCardFeatured: { borderColor: '#AFCDF5' },
  recommendedPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  recommendedText: {
    color: colors.navy,
    fontFamily: typography.bold,
    fontSize: typeScale.xs,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  planName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.md,
    lineHeight: 26,
    marginTop: 13,
  },
  priceRow: { alignItems: 'baseline', flexDirection: 'row', marginTop: 7 },
  planPrice: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: typeScale.xl,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  duration: { color: colors.muted, fontFamily: typography.regular, fontSize: typeScale.xs, lineHeight: 18 },
  planDesc: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginBottom: 13,
    marginTop: 7,
  },
  featureRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 7 },
  featureText: { color: colors.text, fontFamily: typography.medium, fontSize: typeScale.xs, lineHeight: 18 },
  button: { marginTop: 17 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: typeScale.base,
    lineHeight: 24,
    marginTop: 10,
  },
  emptyText: { color: colors.muted, fontFamily: typography.regular, marginTop: 4 },
  safetyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  safetyText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginLeft: 6,
  },
});

export default SubscribeScreen;
