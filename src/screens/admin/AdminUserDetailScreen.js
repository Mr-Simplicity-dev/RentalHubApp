import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { adminService } from '../../services/adminService';
import Button from '../../components/common/Button';
import { getErrorMessage, pickObject } from '../../utils/http';

const AdminUserDetailScreen = ({ route, navigation }) => {
  const userId = route?.params?.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadUser();
  }, [userId]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const response = await adminService.getUserById(userId);
      setUser(pickObject(response, ['data', 'user']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load user details'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await adminService.deleteUser(userId);
      Toast.show({ type: 'success', text1: 'User deleted' });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not delete user'),
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>User not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Icon name="person-outline" size={40} color="#ffffff" />
        </View>
        <Text style={styles.userName}>{user.full_name || user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <Text style={styles.userType}>{user.user_type || 'N/A'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        {[
          { label: 'Phone', value: user.phone || 'N/A' },
          { label: 'Status', value: user.status || 'active' },
          { label: 'Verified', value: user.identity_verified ? 'Yes' : 'No' },
          { label: 'Joined', value: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A' },
          { label: 'State', value: user.state_name || user.state || 'N/A' },
        ].map((field) => (
          <View key={field.label} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue}>{field.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <Text style={styles.infoText}>
          {user.subscription_active ? 'Active' : 'Inactive'}
          {user.subscription_plan ? ` - ${user.subscription_plan}` : ''}
        </Text>
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Button
          title="Delete User"
          variant="danger"
          onPress={handleDeleteUser}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 16, color: '#64748b' },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  userEmail: { color: '#475569', marginTop: 2 },
  userType: {
    marginTop: 6,
    color: '#0284c7',
    fontWeight: '700',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    overflow: 'hidden',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fieldLabel: { color: '#64748b', fontSize: 14 },
  fieldValue: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  infoText: { color: '#334155' },
  dangerZone: {
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  dangerTitle: { fontSize: 16, fontWeight: '700', color: '#dc2626', marginBottom: 10 },
});

export default AdminUserDetailScreen;
