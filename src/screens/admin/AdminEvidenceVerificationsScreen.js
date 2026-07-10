import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import { getErrorMessage, pickList } from '../../utils/http';

const AdminEvidenceVerificationsScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/evidence/pending');
      setItems(pickList(response, ['data', 'evidence']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load pending evidence'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/admin/evidence/${id}/approve`);
      await loadEvidence();
      Toast.show({ type: 'success', text1: 'Evidence approved' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not approve evidence'),
      });
    }
  };

  const reject = async (id) => {
    try {
      await api.post(`/admin/evidence/${id}/reject`);
      await loadEvidence();
      Toast.show({ type: 'success', text1: 'Evidence rejected' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not reject evidence'),
      });
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Icon name="shield-checkmark-outline" size={20} color="#0f172a" />
        <Text style={styles.title}>Evidence Verifications</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadEvidence}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.evidence_type || item.type || 'Evidence'}</Text>
            <Text style={styles.cardMeta}>User: {item.user_name || item.user?.full_name || item.user?.name || 'N/A'}</Text>
            <Text style={styles.cardMeta}>Submitted: {item.submission_date || item.created_at || 'N/A'}</Text>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => approve(item.id)}>
                <Text style={styles.linkText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => reject(item.id)}>
                <Text style={styles.warnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending evidence.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardMeta: { marginTop: 4, color: '#475569' },
  row: { flexDirection: 'row', gap: 16, marginTop: 10 },
  linkText: { color: '#0284c7', fontWeight: '700' },
  warnText: { color: '#dc2626', fontWeight: '700' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});

export default AdminEvidenceVerificationsScreen;
