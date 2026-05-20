import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { userService } from '../../services/userService';
import { getErrorMessage, pickObject } from '../../utils/http';

const statusValue = (value) => (value ? 'verified' : 'pending');

const VerificationStatusScreen = ({ navigation }) => {
  const [status, setStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await userService.getVerificationStatus();
      setStatus(pickObject(response, ['data']) || response?.data || {});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Verification status',
        text2: getErrorMessage(error, 'Could not load verification status'),
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadStatus} />}
    >
      <Text style={styles.title}>Verification Status</Text>
      <Text style={styles.subtitle}>Track email, phone, and identity verification from one place.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Email</Text>
        <StatusBadge status={statusValue(status?.email || status?.email_verified)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phone</Text>
        <StatusBadge status={statusValue(status?.phone || status?.phone_verified)} />
        {!(status?.phone || status?.phone_verified) ? (
          <Button
            title="Verify Phone"
            onPress={() => navigation.navigate('VerifyPhone')}
            style={styles.marginTop}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identity</Text>
        <StatusBadge
          status={
            status?.identity || status?.identity_verified
              ? 'verified'
              : status?.review_status || status?.identity_verification_status || 'pending'
          }
        />
        <Text style={styles.meta}>Document: {status?.identity_document_type || '-'}</Text>
        <Button
          title="Open Profile"
          variant="outline"
          onPress={() => navigation.navigate('Profile')}
          style={styles.marginTop}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { marginTop: 4, marginBottom: 14, textAlign: 'center', color: '#64748b' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  meta: { color: '#475569', marginTop: 8 },
  marginTop: { marginTop: 10 },
});

export default VerificationStatusScreen;
