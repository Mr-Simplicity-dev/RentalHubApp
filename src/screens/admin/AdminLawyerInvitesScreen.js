import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import { superAdminService } from '../../services/superAdminService';
import { getErrorMessage, pickList } from '../../utils/http';

const AdminLawyerInvitesScreen = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const response = await superAdminService.getLawyerInvites();
      setInvites(pickList(response, ['data', 'invites']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load lawyer invites'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (inviteId) => {
    try {
      await superAdminService.resendLawyerInvite(inviteId);
      Toast.show({ type: 'success', text1: 'Invite resent' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not resend invite'),
      });
    }
  };

  const handleRevoke = async (inviteId) => {
    try {
      await superAdminService.revokeLawyerInvite(inviteId);
      Toast.show({ type: 'success', text1: 'Invite revoked' });
      loadInvites();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not revoke invite'),
      });
    }
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={invites}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="briefcase-outline" size={20} color="#0f172a" />
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{item.email}</Text>
                <Text style={styles.cardMeta}>Name: {item.name || item.full_name || 'N/A'}</Text>
              </View>
            </View>
            <Text style={styles.cardStatus}>
              Status: {item.status || 'pending'}
              {item.used_at ? ` | Used: ${new Date(item.used_at).toLocaleDateString()}` : ''}
            </Text>
            {item.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleResend(item.id)}>
                  <Text style={styles.resendText}>Resend</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRevoke(item.id)}>
                  <Text style={styles.revokeText}>Revoke</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="mail-outline" size={48} color="#cbd5e1" />
            <Text style={styles.empty}>No lawyer invites found.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', gap: 10 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardMeta: { color: '#475569', fontSize: 13, marginTop: 2 },
  cardStatus: { color: '#64748b', fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  resendText: { color: '#0284c7', fontWeight: '700' },
  revokeText: { color: '#dc2626', fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  empty: { fontSize: 16, color: '#64748b' },
});

export default AdminLawyerInvitesScreen;
