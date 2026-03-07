import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickList } from '../../utils/http';

const AdminVerificationsScreen = () => {
  const [items, setItems] = useState([]);

  const loadVerifications = async () => {
    try {
      const response = await adminService.getPendingVerifications();
      setItems(pickList(response, ['data', 'users', 'verifications']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load verifications'),
      });
    }
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const approve = async (id) => {
    try {
      await adminService.approveVerification(id);
      await loadVerifications();
      Toast.show({ type: 'success', text1: 'Verification approved' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not approve verification'),
      });
    }
  };

  const reject = async (id) => {
    try {
      await adminService.rejectVerification(id);
      await loadVerifications();
      Toast.show({ type: 'success', text1: 'Verification rejected' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not reject verification'),
      });
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Admin Verifications</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.full_name}</Text>
            <Text style={styles.cardMeta}>{item.email}</Text>
            <Text style={styles.cardMeta}>
              {item.identity_document_type === 'passport'
                ? `Passport: ${item.international_passport_number || 'N/A'}`
                : `NIN: ${item.nin || 'N/A'}`}
            </Text>
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
        ListEmptyComponent={<Text style={styles.empty}>No pending verifications.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  title: { textAlign: 'center', marginVertical: 12, fontSize: 22, fontWeight: '800', color: '#0f172a' },
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

export default AdminVerificationsScreen;
