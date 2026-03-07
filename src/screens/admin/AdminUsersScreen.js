import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickList } from '../../utils/http';

const AdminUsersScreen = () => {
  const [users, setUsers] = useState([]);

  const loadUsers = async () => {
    try {
      const response = await adminService.getUsers();
      setUsers(pickList(response, ['data', 'users']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load users'),
      });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const removeUser = async (id) => {
    try {
      await adminService.deleteUser(id);
      await loadUsers();
      Toast.show({ type: 'success', text1: 'User deleted' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not delete user'),
      });
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Admin Users</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.full_name}</Text>
            <Text style={styles.cardMeta}>{item.email}</Text>
            <Text style={styles.cardMeta}>Role: {item.user_type || '-'}</Text>
            <TouchableOpacity onPress={() => removeUser(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
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
  deleteText: { marginTop: 8, color: '#dc2626', fontWeight: '700' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});

export default AdminUsersScreen;
