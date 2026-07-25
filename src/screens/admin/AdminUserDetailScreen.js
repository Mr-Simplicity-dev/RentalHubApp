import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import OperationNoteModal from '../../components/admin/OperationNoteModal';
import {
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { adminService } from '../../services/adminService';
import { getErrorMessage, pickObject } from '../../utils/http';
import { colors, typography } from '../../theme';

const AdminUserDetailScreen = ({ route, navigation }) => {
  const userId = route?.params?.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [disablePromptVisible, setDisablePromptVisible] = useState(false);

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

  const handleDeleteUser = async (reason) => {
    setDeleting(true);
    try {
      await adminService.deleteUser(userId, reason);
      setDisablePromptVisible(false);
      Toast.show({ type: 'success', text1: 'User disabled' });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not disable user'),
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <PremiumCenter loading title="Loading user details" />;
  }

  if (!user) {
    return (
      <PremiumCenter
        icon="person-circle-outline"
        title="User not found"
        message="This account could not be loaded from the admin API."
      />
    );
  }

  const userType = user.user_type || 'N/A';
  const status = user.status || 'active';

  const canDisable = ['tenant', 'landlord'].includes(userType);

  return (
    <>
      <PremiumScreen>
      <PremiumHero
        eyebrow="Admin user profile"
        title={user.full_name || user.name || 'User account'}
        subtitle={user.email || 'No email on file'}
        icon="person-circle-outline"
        right={<StatusPill label={userType} color={colors.gold} />}
      />

      <PremiumCard style={styles.profileCard}>
        <View style={styles.avatar}>
          <Icon name="person-outline" size={34} color={colors.white} />
        </View>
        <Text style={styles.userName}>{user.full_name || user.name || 'User account'}</Text>
        <Text style={styles.userEmail}>{user.email || 'No email'}</Text>
        <StatusPill label={status} color={status === 'active' ? colors.success : colors.warning} />
      </PremiumCard>

      <PremiumSectionTitle title="Account information" />
      <PremiumCard>
        <InfoRow icon="call-outline" label="Phone" value={user.phone || 'N/A'} />
        <InfoRow icon="shield-checkmark-outline" label="Verified" value={user.identity_verified ? 'Yes' : 'No'} />
        <InfoRow
          icon="calendar-outline"
          label="Joined"
          value={user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
        />
        <InfoRow icon="location-outline" label="State" value={user.state_name || user.state || 'N/A'} />
      </PremiumCard>

      <PremiumSectionTitle title="Subscription" />
      <PremiumCard>
        <InfoRow
          icon="diamond-outline"
          label="Plan"
          value={`${user.subscription_active ? 'Active' : 'Inactive'}${user.subscription_plan ? ` • ${user.subscription_plan}` : ''}`}
        />
      </PremiumCard>

        {canDisable ? (
          <PremiumCard style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Danger zone</Text>
            <Text style={styles.dangerCopy}>
              Disabling this account immediately blocks access and records the reason in the audit history.
            </Text>
            <PremiumButton
              title="Disable user"
              variant="danger"
              onPress={() => setDisablePromptVisible(true)}
              loading={deleting}
              icon="ban-outline"
            />
          </PremiumCard>
        ) : null}
      </PremiumScreen>
      <OperationNoteModal
        visible={disablePromptVisible}
        title="Disable user account"
        message={`${user.full_name || user.email || 'This user'} will no longer be able to sign in.`}
        label="Disable reason"
        placeholder="Explain why this account must be disabled"
        confirmText="Disable account"
        icon="ban-outline"
        variant="danger"
        loading={deleting}
        onCancel={() => setDisablePromptVisible(false)}
        onConfirm={handleDeleteUser}
      />
    </>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    marginBottom: 12,
    width: 76,
  },
  userName: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 20,
    textAlign: 'center',
  },
  userEmail: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginBottom: 10,
    marginTop: 3,
  },
  dangerZone: {
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
  },
  dangerTitle: {
    color: colors.danger,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  dangerCopy: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: 5,
  },
});

export default AdminUserDetailScreen;
