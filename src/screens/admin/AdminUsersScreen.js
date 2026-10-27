import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useState } from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
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
import { colors, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const AdminUsersScreen = ({ navigation }) => {
  useInterfaceLanguage();
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
        text1: ui("Failed"),
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
      Toast.show({ type: 'success', text1: ui("User disabled") });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Failed"),
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
        emptyTitle={ui("No users found")}
        emptyMessage={ui("Users will appear here when they register or are added.")}
        emptyIcon="people-outline"
        header={
          <PremiumHero
            eyebrow={ui("Administration")}
            title={ui("Users")}
            subtitle={ui("Manage user identities, roles and account access from a mobile-first view.")}
            icon="people-outline"
            right={<StatusPill label={ui("{value0} records", {value0: (users.length)})} color={colors.blue} />}
          />
        }
        renderItem={({ item }) => (
          <PremiumCard>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={ui("Open {value0} details", {value0: (item.full_name || ui("user"))})}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AdminUserDetail', { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <AppText style={styles.avatarText}>{String(item.full_name || item.email || 'U').slice(0, 1).toUpperCase()}</AppText>
                </View>
                <View style={styles.cardCopy}>
                  <AppText style={styles.cardTitle}>{item.full_name || 'Unnamed user'}</AppText>
                  <AppText style={styles.cardMeta}>{item.email || 'No email provided'}</AppText>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.muted} />
              </View>
            </TouchableOpacity>
            <InfoRow icon="shield-outline" label={ui("Role")} value={item.user_type || '—'} />
            <InfoRow icon="call-outline" label={ui("Phone")} value={item.phone || item.phone_number || '—'} />
            {['tenant', 'landlord'].includes(item.user_type) ? (
              <PremiumButton
                title={ui("Disable user")}
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
        title={ui("Disable user account")}
        message={ui("{value0} will lose access until the account is restored by an administrator.", {value0: (selectedUser?.full_name || selectedUser?.email || ui("This user"))})}
        label={ui("Disable reason")}
        placeholder={ui("Explain why this account must be disabled")}
        confirmText={ui("Disable account")}
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
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
    marginTop: 3,
  },
});

export default AdminUsersScreen;
