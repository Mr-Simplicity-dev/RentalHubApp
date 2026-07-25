import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import OperationNoteModal from '../../components/admin/OperationNoteModal';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickList } from '../../utils/http';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumHero,
  PremiumListScreen,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { colors, typography } from '../../theme';

const AdminUsersScreen = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [disabling, setDisabling] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getUsers();
      setUsers(pickList(response, ['data', 'users']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load users'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const removeUser = async (reason) => {
    if (!selectedUser?.id) return;

    setDisabling(true);
    try {
      await adminService.deleteUser(selectedUser.id, reason);
      setSelectedUser(null);
      await loadUsers();
      Toast.show({ type: 'success', text1: 'User disabled' });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not disable user'),
      });
    } finally {
      setDisabling(false);
    }
  };

  return (
    <>
      <PremiumListScreen
        data={users}
        refreshing={loading}
        onRefresh={loadUsers}
        keyExtractor={(item) => String(item.id)}
        emptyTitle="No users found"
        emptyMessage="Users will appear here when they register or are added."
        emptyIcon="people-outline"
        header={
          <PremiumHero
            eyebrow="Administration"
            title="Users"
            subtitle="Manage user identities, roles and account access from a mobile-first view."
            icon="people-outline"
            right={<StatusPill label={`${users.length} records`} color={colors.blue} />}
          />
        }
        renderItem={({ item }) => (
          <PremiumCard>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{String(item.full_name || item.email || 'U').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{item.full_name || 'Unnamed user'}</Text>
                <Text style={styles.cardMeta}>{item.email || 'No email provided'}</Text>
              </View>
            </View>
            <InfoRow icon="shield-outline" label="Role" value={item.user_type || '—'} />
            <InfoRow icon="call-outline" label="Phone" value={item.phone || item.phone_number || '—'} />
            {['tenant', 'landlord'].includes(item.user_type) ? (
              <PremiumButton
                title="Disable user"
                variant="ghost"
                icon="ban-outline"
                onPress={() => setSelectedUser(item)}
              />
            ) : null}
          </PremiumCard>
        )}
      />
      <OperationNoteModal
        visible={Boolean(selectedUser)}
        title="Disable user account"
        message={`${selectedUser?.full_name || selectedUser?.email || 'This user'} will lose access until the account is restored by an administrator.`}
        label="Disable reason"
        placeholder="Explain why this account must be disabled"
        confirmText="Disable account"
        icon="ban-outline"
        variant="danger"
        loading={disabling}
        onCancel={() => setSelectedUser(null)}
        onConfirm={removeUser}
      />
    </>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
});

export default AdminUsersScreen;
