import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { paymentService } from '../../services/paymentService';
import { recoverPayment, savePendingPayment } from '../../services/paymentRecoveryService';
import useNativePaystackCheckout from '../../hooks/useNativePaystackCheckout';
import { hasPaystackCheckout } from '../../services/nativePaymentService';
import { colors, radius, shadows, typography } from '../../theme';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const SubscribeScreen = ({ navigation }) => {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const { openNativeCheckout, NativePaystackCheckoutModal } = useNativePaystackCheckout();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
        text1: 'Could not load subscriptions',
        text2: getErrorMessage(error, 'Please try again.'),
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
          title: 'Pay subscription',
          subtitle: 'Complete your membership payment securely in the app.',
          amountLabel: selectedPlan?.amount ? `₦${Number(selectedPlan.amount).toLocaleString()}` : '',
          onSuccess: (paymentResponse) =>
            completeSubscriptionPayment(paymentResponse?.reference || reference),
          onBrowserFallback: () => {
            Toast.show({
              type: 'info',
              text1: 'Paystack checkout opened',
              text2: 'Complete payment securely, then return to RentalHub.',
            });
          },
        });
      } else if (reference) {
        await completeSubscriptionPayment(reference);
      } else {
        Toast.show({
          type: 'success',
          text1: 'Subscription initialized',
          text2: 'Refresh this page to confirm activation.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Subscription failed',
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
        Toast.show({ type: 'success', text1: 'Subscription activated' });
        await loadSubscriptionData({ refresh: true });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Verification failed',
          text2: response?.message || 'Could not verify subscription payment.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Verification failed',
        text2: getErrorMessage(error, 'Could not verify subscription payment.'),
      });
    }
  };

  const expiry = status?.subscription_expires_at || status?.expires_at;
  const activePlanName = status?.plan_name || status?.subscription_plan_name;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>MEMBERSHIP</Text>
          <Text style={styles.title}>Subscription</Text>
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
            <Text style={styles.loadingText}>Loading membership options…</Text>
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
              <Text style={styles.statusEyebrow}>
                {status?.subscription_active ? 'ACTIVE MEMBERSHIP' : 'PREMIUM ACCESS'}
              </Text>
              <Text style={styles.statusTitle}>
                {status?.subscription_active
                  ? activePlanName || 'Your subscription is active'
                  : 'Unlock the complete rental experience'}
              </Text>
              <Text style={styles.statusText}>
                {status?.subscription_active
                  ? expiry
                    ? `Your access remains active until ${new Date(expiry).toLocaleDateString()}.`
                    : 'Your premium RentalHub access is currently active.'
                  : 'View full property details, verified contacts and premium tenant tools.'}
              </Text>
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
                  <Text style={styles.benefitText}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionEyebrow}>CHOOSE YOUR ACCESS</Text>
              <Text style={styles.sectionTitle}>Available plans</Text>
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
                      <Text style={styles.recommendedText}>RECOMMENDED</Text>
                    </View>
                  ) : null}
                  <Text style={styles.planName}>{plan.name || 'RentalHub membership'}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>₦{Number(plan.amount || 0).toLocaleString()}</Text>
                    {plan.duration_days ? (
                      <Text style={styles.duration}> / {plan.duration_days} days</Text>
                    ) : null}
                  </View>
                  <Text style={styles.planDesc}>
                    {plan.description || 'Premium tenant access and complete property information.'}
                  </Text>
                  {(features.length ? features : ['Full property details', 'Verified contact access']).map(
                    (feature) => (
                      <View key={String(feature)} style={styles.featureRow}>
                        <Icon name="checkmark-circle" size={17} color={colors.success} />
                        <Text style={styles.featureText}>{String(feature)}</Text>
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
                <Text style={styles.emptyTitle}>Plans are being updated</Text>
                <Text style={styles.emptyText}>Please check again shortly.</Text>
              </View>
            ) : null}

            <View style={styles.safetyRow}>
              <Icon name="shield-checkmark-outline" size={17} color={colors.success} />
              <Text style={styles.safetyText}>Secure payment processing powered by Paystack</Text>
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
    fontSize: 13,
    letterSpacing: 1.2,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 2,
  },
  content: { padding: 18, paddingBottom: 32 },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 480 },
  loadingText: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
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
    fontSize: 13,
    letterSpacing: 1.2,
    marginTop: 17,
  },
  statusTitle: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: 23,
    letterSpacing: -0.5,
    marginTop: 5,
  },
  statusText: {
    color: '#B7C8E2',
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 13,
    lineHeight: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionHeading: { marginBottom: 13, marginTop: 28 },
  sectionEyebrow: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
    letterSpacing: 1.2,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 21,
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
    fontSize: 13,
    letterSpacing: 0.8,
  },
  planName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 18,
    marginTop: 13,
  },
  priceRow: { alignItems: 'baseline', flexDirection: 'row', marginTop: 7 },
  planPrice: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 27,
    letterSpacing: -0.5,
  },
  duration: { color: colors.muted, fontFamily: typography.regular, fontSize: 13 },
  planDesc: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 13,
    marginTop: 7,
  },
  featureRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 7 },
  featureText: { color: colors.text, fontFamily: typography.medium, fontSize: 13 },
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
    fontSize: 16,
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
    fontSize: 13,
    marginLeft: 6,
  },
});

export default SubscribeScreen;
