import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import { paymentService } from '../../services/paymentService';
import { getErrorMessage, pickList, pickObject } from '../../utils/http';

const SubscribeScreen = () => {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const loadSubscriptionData = async () => {
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
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load subscription data'),
      });
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const subscribe = async (planId) => {
    setLoadingId(planId);
    try {
      const response = await paymentService.initializeSubscription(planId, 'paystack');
      const url = response?.data?.authorization_url;
      if (url) {
        await Linking.openURL(url);
      } else {
        Toast.show({
          type: 'success',
          text1: 'Subscription initialized',
          text2: 'Complete the payment flow to activate your plan.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not initialize subscription'),
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subscription</Text>
      <Text style={styles.subtitle}>
        {status?.subscription_active
          ? 'Your subscription is active.'
          : 'Unlock full property details and landlord contact information.'}
      </Text>

      {plans.map((plan) => (
        <View key={plan.id} style={styles.card}>
          <Text style={styles.planName}>{plan.name || 'Subscription Plan'}</Text>
          <Text style={styles.planPrice}>NGN {Number(plan.amount || 0).toLocaleString()}</Text>
          <Text style={styles.planDesc}>{plan.description || 'Premium tenant access'}</Text>
          <Button
            title="Subscribe"
            onPress={() => subscribe(plan.id)}
            loading={loadingId === plan.id}
            style={styles.button}
          />
        </View>
      ))}

      {plans.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.planDesc}>No subscription plans are available right now.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 6, marginBottom: 16, color: '#64748b' },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  planName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  planPrice: { marginTop: 6, fontSize: 24, fontWeight: '800', color: '#0284c7' },
  planDesc: { marginTop: 6, color: '#475569' },
  button: { marginTop: 10 },
});

export default SubscribeScreen;
