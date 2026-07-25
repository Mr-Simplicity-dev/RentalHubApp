import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../common/Button';
import OperationNoteModal from './OperationNoteModal';
import { propertyAlertAdminService } from '../../services/propertyAlertAdminService';
import { getErrorMessage, pickList } from '../../utils/http';

const SUPPORT_STATUSES = [
  ['pending_support_review', 'Pending Review'],
  ['approved_assigned', 'Approved'],
  ['rejected', 'Rejected'],
  ['sourcing', 'Sourcing'],
  ['lga_coverage_missing', 'LGA Missing'],
  ['fulfilled', 'Fulfilled'],
  ['all', 'All'],
];

const STATE_STATUSES = [
  ['approved_assigned', 'Assigned'],
  ['sourcing', 'Sourcing'],
  ['lga_coverage_missing', 'LGA Missing'],
  ['fulfilled', 'Fulfilled'],
  ['all', 'All'],
];

const PropertyRequestWorkflowSection = ({
  mode = 'support',
  title = 'Tenant Property Requests',
}) => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState(
    mode === 'support' ? 'pending_support_review' : 'approved_assigned'
  );
  const [pendingAction, setPendingAction] = useState(null);

  const statusOptions = mode === 'support' ? SUPPORT_STATUSES : STATE_STATUSES;

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await propertyAlertAdminService.listRequests({ status, limit: 50 });
      setRequests(pickList(response, ['data']) || []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Load failed',
        text2: getErrorMessage(error, 'Could not load property requests'),
      });
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const supportReview = (request, decision) => {
    setPendingAction({ kind: 'support', request, action: decision });
  };

  const stateAction = (request, action) => {
    setPendingAction({ kind: 'state', request, action });
  };

  const submitPendingAction = async (note) => {
    if (!pendingAction) return;

    try {
      setLoading(true);
      if (pendingAction.kind === 'support') {
        await propertyAlertAdminService.supportReview(pendingAction.request.id, {
          decision: pendingAction.action,
          review_note: note || undefined,
        });
      } else {
        await propertyAlertAdminService.stateAction(pendingAction.request.id, {
          action: pendingAction.action,
          note: note || undefined,
        });
      }
      Toast.show({ type: 'success', text1: 'Request updated' });
      setPendingAction(null);
      await loadRequests();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not update request'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.chipRow}>
        {statusOptions.map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, status === value && styles.chipActive]}
            onPress={() => setStatus(value)}
          >
            <Text style={[styles.chipText, status === value && styles.chipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button title="Refresh" onPress={loadRequests} loading={loading} />

      {requests.length === 0 ? (
        <Text style={styles.meta}>No requests for this filter.</Text>
      ) : (
        requests.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.tenant_name || 'Tenant'} · {item.state_name || 'State'}
              {item.lga_name ? ` · ${item.lga_name}` : ''}
            </Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            {item.budget_min || item.budget_max ? (
              <Text style={styles.meta}>
                Budget: ₦{Number(item.budget_min || 0).toLocaleString()} - ₦
                {Number(item.budget_max || 0).toLocaleString()}
              </Text>
            ) : null}
            {mode === 'support' ? (
              <View style={styles.row}>
                <TouchableOpacity onPress={() => supportReview(item, 'approved')}>
                  <Text style={styles.link}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => supportReview(item, 'rejected')}>
                  <Text style={styles.danger}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity onPress={() => stateAction(item, 'sourcing')}>
                  <Text style={styles.link}>Sourcing</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => stateAction(item, 'fulfilled')}>
                  <Text style={styles.link}>Fulfilled</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}

      <OperationNoteModal
        visible={Boolean(pendingAction)}
        title={
          pendingAction?.kind === 'support'
            ? pendingAction?.action === 'approved'
              ? 'Approve property request'
              : 'Reject property request'
            : pendingAction?.action === 'fulfilled'
              ? 'Mark request fulfilled'
              : 'Start property sourcing'
        }
        message="Add context for the audit history, or continue without a note."
        label="Review note"
        placeholder="Optional context for this decision"
        confirmText={
          pendingAction?.action === 'approved'
            ? 'Approve'
            : pendingAction?.action === 'rejected'
              ? 'Reject'
              : pendingAction?.action === 'fulfilled'
                ? 'Mark fulfilled'
                : 'Start sourcing'
        }
        icon={
          pendingAction?.action === 'rejected'
            ? 'close-circle-outline'
            : 'checkmark-circle-outline'
        }
        variant={pendingAction?.action === 'rejected' ? 'danger' : 'primary'}
        required={false}
        loading={loading}
        onCancel={() => setPendingAction(null)}
        onConfirm={submitPendingAction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 12 },
  heading: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { fontSize: 12, color: '#334155' },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
  link: { color: '#2563eb', fontWeight: '600' },
  danger: { color: '#dc2626', fontWeight: '600' },
});

export default PropertyRequestWorkflowSection;
