import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import OptionPickerModal from '../common/OptionPickerModal';
import { paymentService } from '../../services/paymentService';
import { getErrorMessage, pickList } from '../../utils/http';

const TenancyGracePanel = ({ userType = 'tenant' }) => {
  const isTenant = userType === 'tenant';
  const isLandlord = userType === 'landlord';

  const [loading, setLoading] = useState(false);
  const [eligiblePayments, setEligiblePayments] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [landlordRequests, setLandlordRequests] = useState([]);
  const [landlordFilter, setLandlordFilter] = useState('pending');
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [form, setForm] = useState({
    payment_id: '',
    requested_duration_days: '',
    requested_duration_months: '',
    tenant_note: '',
  });
  const [approveForm, setApproveForm] = useState({
    approved_duration_days: '',
    approved_duration_months: '',
    landlord_note: '',
  });
  const [rejectNote, setRejectNote] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(null);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      const [eligibleRes, historyRes] = await Promise.all([
        paymentService.getEligibleGracePayments(),
        paymentService.getMyGraceRequests(),
      ]);
      setEligiblePayments(pickList(eligibleRes, ['data']) || []);
      setMyRequests(pickList(historyRes, ['data']) || []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Grace period',
        text2: getErrorMessage(error, 'Could not load grace data'),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLandlordData = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getLandlordGraceRequests(landlordFilter);
      setLandlordRequests(pickList(response, ['data']) || []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Grace requests',
        text2: getErrorMessage(error, 'Could not load requests'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isTenant) loadTenantData();
    if (isLandlord) loadLandlordData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType, landlordFilter]);

  const submitTenantRequest = async () => {
    if (!form.payment_id) {
      Toast.show({ type: 'error', text1: 'Select a tenancy payment' });
      return;
    }
    if (!form.requested_duration_days && !form.requested_duration_months) {
      Toast.show({ type: 'error', text1: 'Enter requested duration (days or months)' });
      return;
    }

    try {
      setLoading(true);
      const response = await paymentService.requestGracePeriod({
        payment_id: form.payment_id,
        requested_duration_days: form.requested_duration_days || undefined,
        requested_duration_months: form.requested_duration_months || undefined,
        tenant_note: form.tenant_note || undefined,
      });
      if (response.success === false) {
        throw new Error(response.message || 'Request failed');
      }
      Toast.show({ type: 'success', text1: 'Grace request submitted' });
      setForm({
        payment_id: '',
        requested_duration_days: '',
        requested_duration_months: '',
        tenant_note: '',
      });
      await loadTenantData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Request failed',
        text2: getErrorMessage(error, 'Could not submit grace request'),
      });
    } finally {
      setLoading(false);
    }
  };

  const respondLandlord = async (requestId, action) => {
    if (action === 'reject' && !rejectNote.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a rejection reason' });
      return;
    }

    try {
      setLoading(true);
      const payload =
        action === 'approve'
          ? {
              action: 'approve',
              approved_duration_days: approveForm.approved_duration_days || undefined,
              approved_duration_months: approveForm.approved_duration_months || undefined,
              landlord_note: approveForm.landlord_note || undefined,
            }
          : { action: 'reject', landlord_note: rejectNote.trim() };

      const response = await paymentService.respondToGraceRequest(requestId, payload);
      if (response.success === false) {
        throw new Error(response.message || 'Action failed');
      }
      Toast.show({ type: 'success', text1: `Request ${action}d` });
      setActiveRequestId(null);
      setRejectNote('');
      setApproveForm({
        approved_duration_days: '',
        approved_duration_months: '',
        landlord_note: '',
      });
      await loadLandlordData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Action failed',
        text2: getErrorMessage(error, 'Could not update request'),
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPayment = eligiblePayments.find(
    (item) => String(item.id) === String(form.payment_id)
  );

  if (!isTenant && !isLandlord) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Tenancy Grace Period</Text>

      {isTenant ? (
        <>
          <Text style={styles.subheading}>Request extra time after tenancy expiry.</Text>
          <SelectField
            label="Tenancy payment"
            value={
              selectedPayment
                ? `${selectedPayment.property_title || 'Property'} · ${new Date(
                    selectedPayment.tenancy_expires_at
                  ).toLocaleDateString()}`
                : ''
            }
            placeholder="Select payment"
            onPress={() => setShowPaymentPicker(true)}
          />
          <TextInput
            style={styles.input}
            placeholder="Requested days"
            keyboardType="number-pad"
            value={form.requested_duration_days}
            onChangeText={(value) => setForm((prev) => ({ ...prev, requested_duration_days: value }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Requested months"
            keyboardType="number-pad"
            value={form.requested_duration_months}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, requested_duration_months: value }))
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Note to landlord (optional)"
            value={form.tenant_note}
            onChangeText={(value) => setForm((prev) => ({ ...prev, tenant_note: value }))}
          />
          <Button title="Submit Grace Request" onPress={submitTenantRequest} loading={loading} />

          {myRequests.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Your requests</Text>
              {myRequests.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{item.property_title || 'Property'}</Text>
                  <Text style={styles.meta}>Status: {item.status}</Text>
                </View>
              ))}
            </>
          ) : null}

          <OptionPickerModal
            visible={showPaymentPicker}
            title="Select tenancy"
            options={eligiblePayments}
            selectedValue={form.payment_id}
            getOptionLabel={(item) =>
              `${item.property_title || 'Property'} · expires ${new Date(
                item.tenancy_expires_at
              ).toLocaleDateString()}`
            }
            getOptionValue={(item) => item.id}
            onClose={() => setShowPaymentPicker(false)}
            onSelect={(item) => setForm((prev) => ({ ...prev, payment_id: String(item.id) }))}
          />
        </>
      ) : null}

      {isLandlord ? (
        <>
          <View style={styles.chipRow}>
            {['pending', 'landlord_approved', 'landlord_rejected', 'all'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.chip, landlordFilter === filter && styles.chipActive]}
                onPress={() => setLandlordFilter(filter)}
              >
                <Text
                  style={[styles.chipText, landlordFilter === filter && styles.chipTextActive]}
                >
                  {filter.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button title="Refresh" onPress={loadLandlordData} loading={loading} />
          {landlordRequests.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.tenant_name || 'Tenant'} · {item.property_title || 'Property'}
              </Text>
              <Text style={styles.meta}>Status: {item.status}</Text>
              {activeRequestId === item.id ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Approved days"
                    keyboardType="number-pad"
                    value={approveForm.approved_duration_days}
                    onChangeText={(value) =>
                      setApproveForm((prev) => ({ ...prev, approved_duration_days: value }))
                    }
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Approved months"
                    keyboardType="number-pad"
                    value={approveForm.approved_duration_months}
                    onChangeText={(value) =>
                      setApproveForm((prev) => ({ ...prev, approved_duration_months: value }))
                    }
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Landlord note"
                    value={approveForm.landlord_note}
                    onChangeText={(value) =>
                      setApproveForm((prev) => ({ ...prev, landlord_note: value }))
                    }
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Rejection reason"
                    value={rejectNote}
                    onChangeText={setRejectNote}
                  />
                  <View style={styles.row}>
                    <TouchableOpacity onPress={() => respondLandlord(item.id, 'approve')}>
                      <Text style={styles.link}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => respondLandlord(item.id, 'reject')}>
                      <Text style={styles.danger}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveRequestId(null)}>
                      <Text style={styles.meta}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity onPress={() => setActiveRequestId(item.id)}>
                  <Text style={styles.link}>Review</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  heading: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  subheading: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 12, color: '#0f172a' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    fontSize: 14,
  },
  card: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
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
  row: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  link: { color: '#2563eb', fontWeight: '600' },
  danger: { color: '#dc2626', fontWeight: '600' },
});

export default TenancyGracePanel;
