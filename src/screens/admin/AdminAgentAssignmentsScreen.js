import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { adminAgentService } from '../../services/adminAgentService';
import { getErrorMessage, pickList } from '../../utils/http';

const AdminAgentAssignmentsScreen = () => {
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ landlordId: '', agentId: '' });

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const response = await adminAgentService.getAssignments({ status: 'active', limit: 50 });
      setAssignments(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load assignments'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const createAssignment = async () => {
    if (!form.landlordId || !form.agentId) {
      Toast.show({ type: 'error', text1: 'Landlord ID and Agent ID are required' });
      return;
    }

    try {
      await adminAgentService.createAssignment({
        landlordId: Number(form.landlordId),
        agentId: Number(form.agentId),
      });
      Toast.show({ type: 'success', text1: 'Assignment created' });
      setForm({ landlordId: '', agentId: '' });
      await loadAssignments();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Create failed',
        text2: getErrorMessage(error, 'Could not create assignment'),
      });
    }
  };

  const setActiveState = async (item, action) => {
    try {
      if (action === 'revoke') {
        await adminAgentService.revokeAssignment(item.id);
      } else if (action === 'deactivate') {
        await adminAgentService.deactivateAssignment(item.id);
      } else if (action === 'reactivate') {
        await adminAgentService.reactivateAssignment(item.id);
      }
      await loadAssignments();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Action failed',
        text2: getErrorMessage(error, 'Could not update assignment status'),
      });
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Agent Assignments</Text>

      <View style={styles.formCard}>
        <Input
          label="Landlord User ID"
          value={form.landlordId}
          keyboardType="number-pad"
          onChangeText={(value) => setForm((prev) => ({ ...prev, landlordId: value }))}
        />
        <Input
          label="Agent User ID"
          value={form.agentId}
          keyboardType="number-pad"
          onChangeText={(value) => setForm((prev) => ({ ...prev, agentId: value }))}
        />
        <Button title="Assign Agent" onPress={createAssignment} />
      </View>

      <Text style={styles.sectionTitle}>Current Assignments</Text>
      {loading ? <Text style={styles.empty}>Loading...</Text> : null}
      {!loading && assignments.length === 0 ? <Text style={styles.empty}>No assignments found.</Text> : null}

      {assignments.map((item) => (
        <View key={String(item.id)} style={styles.row}>
          <Text style={styles.name}>{item.agent_name || `Agent #${item.agent_user_id}`}</Text>
          <Text style={styles.meta}>Landlord: {item.landlord_name || item.landlord_user_id}</Text>
          <Text style={styles.meta}>Status: {item.status}</Text>
          <View style={styles.actions}>
            {item.status === 'active' ? (
              <>
                <TouchableOpacity onPress={() => setActiveState(item, 'deactivate')}>
                  <Text style={styles.link}>Deactivate</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveState(item, 'revoke')}>
                  <Text style={styles.danger}>Revoke</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setActiveState(item, 'reactivate')}>
                <Text style={styles.link}>Reactivate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  formCard: { marginTop: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12 },
  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 17, fontWeight: '700', color: '#0f172a' },
  empty: { color: '#64748b' },
  row: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 },
  name: { color: '#0f172a', fontWeight: '700' },
  meta: { marginTop: 4, color: '#64748b' },
  actions: { flexDirection: 'row', gap: 14, marginTop: 8 },
  link: { color: '#0284c7', fontWeight: '700' },
  danger: { color: '#dc2626', fontWeight: '700' },
});

export default AdminAgentAssignmentsScreen;
