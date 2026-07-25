import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../common/Button';
import { tenancyAdjustmentService } from '../../services/tenancyAdjustmentService';
import { getErrorMessage, pickList } from '../../utils/http';

const TenancyWorkflowSection = ({ title = 'Tenancy Grace and Refund Enablement' }) => {
  const [loading, setLoading] = useState(false);
  const [graceRequests, setGraceRequests] = useState([]);
  const [relocationRefunds, setRelocationRefunds] = useState([]);
  const [notes, setNotes] = useState({});

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [graceRes, refundRes] = await Promise.all([
        tenancyAdjustmentService.getAdminGraceRequests({
          status: 'pending_admin_review',
          limit: 20,
        }),
        tenancyAdjustmentService.getAdminRelocationRefunds({
          category: 'early_exit_refund',
          status: 'pending',
          limit: 20,
        }),
      ]);
      setGraceRequests(pickList(graceRes, ['data']) || []);
      setRelocationRefunds(
        (pickList(refundRes, ['data']) || []).filter((item) => item.feature_enabled !== true)
      );
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Load failed',
        text2: getErrorMessage(error, 'Could not load tenancy workflow'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const reviewGrace = async (requestId, action) => {
    const key = `grace_${requestId}`;
    try {
      setLoading(true);
      await tenancyAdjustmentService.reviewAdminGraceRequest(requestId, {
        action,
        admin_note: notes[key] || undefined,
      });
      Toast.show({ type: 'success', text1: action === 'enable' ? 'Grace enabled' : 'Grace rejected' });
      await loadRequests();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Action failed',
        text2: getErrorMessage(error, 'Could not review grace request'),
      });
    } finally {
      setLoading(false);
    }
  };

  const reviewRefund = async (refundId, action) => {
    const key = `refund_${refundId}`;
    try {
      setLoading(true);
      await tenancyAdjustmentService.reviewAdminRelocationRefund(refundId, {
        action,
        admin_note: notes[key] || undefined,
      });
      Toast.show({
        type: 'success',
        text1: action === 'enable' ? 'Refund enabled' : 'Refund rejected',
      });
      await loadRequests();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Action failed',
        text2: getErrorMessage(error, 'Could not review refund'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.subheading}>
        Pending grace: {graceRequests.length} · Pending relocation refunds:{' '}
        {relocationRefunds.length}
      </Text>
      <Button title="Refresh" onPress={loadRequests} loading={loading} />

      <Text style={styles.sectionTitle}>Grace Period Requests</Text>
      {graceRequests.length === 0 ? (
        <Text style={styles.meta}>No pending grace requests.</Text>
      ) : (
        graceRequests.map((item) => {
          const key = `grace_${item.id}`;
          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.tenant_name || 'Tenant'} · {item.property_title || 'Property'}
              </Text>
              <Text style={styles.meta}>Status: {item.status}</Text>
              <TextInput
                style={styles.input}
                placeholder="Admin note (optional)"
                value={notes[key] || ''}
                onChangeText={(value) => setNotes((prev) => ({ ...prev, [key]: value }))}
              />
              <View style={styles.row}>
                <TouchableOpacity onPress={() => reviewGrace(item.id, 'enable')}>
                  <Text style={styles.link}>Enable</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => reviewGrace(item.id, 'reject')}>
                  <Text style={styles.danger}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Relocation Refunds</Text>
      {relocationRefunds.length === 0 ? (
        <Text style={styles.meta}>No pending relocation refunds.</Text>
      ) : (
        relocationRefunds.map((item) => {
          const key = `refund_${item.id}`;
          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.tenant_name || 'Tenant'} · ₦{Number(item.amount || 0).toLocaleString()}
              </Text>
              <Text style={styles.meta}>Status: {item.status}</Text>
              <TextInput
                style={styles.input}
                placeholder="Admin note (optional)"
                value={notes[key] || ''}
                onChangeText={(value) => setNotes((prev) => ({ ...prev, [key]: value }))}
              />
              <View style={styles.row}>
                <TouchableOpacity onPress={() => reviewRefund(item.id, 'enable')}>
                  <Text style={styles.link}>Enable</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => reviewRefund(item.id, 'reject')}>
                  <Text style={styles.danger}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 12 },
  heading: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subheading: { fontSize: 13, color: '#64748b' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    fontSize: 14,
  },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
  link: { color: '#2563eb', fontWeight: '600' },
  danger: { color: '#dc2626', fontWeight: '600' },
});

export default TenancyWorkflowSection;
