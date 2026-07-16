import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { superAdminService } from '../../services/superAdminService';
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

const AdminLawyerInvitesScreen = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setLoading(true);
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
    <PremiumListScreen
      data={invites}
      refreshing={loading}
      onRefresh={loadInvites}
      keyExtractor={(item) => String(item.id)}
      emptyTitle="No lawyer invites"
      emptyMessage="Lawyer invitations will appear here once created."
      emptyIcon="mail-outline"
      header={
        <PremiumHero
          eyebrow="Legal network"
          title="Lawyer invites"
          subtitle="Monitor invitations, resend access and revoke pending invites from mobile."
          icon="briefcase-outline"
          right={<StatusPill label={`${invites.length} invites`} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardHeader}>
            <View style={styles.inviteIcon}>
              <Text style={styles.inviteIconText}>LG</Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{item.email || 'No email provided'}</Text>
              <Text style={styles.cardMeta}>{item.name || item.full_name || 'Name unavailable'}</Text>
            </View>
          </View>
          <InfoRow icon="mail-outline" label="Status" value={item.status || 'pending'} />
          {item.used_at ? (
            <InfoRow icon="checkmark-done-outline" label="Used" value={new Date(item.used_at).toLocaleDateString()} />
          ) : null}
          {item.status === 'pending' ? (
            <View style={styles.actions}>
              <PremiumButton title="Resend invite" icon="send-outline" onPress={() => handleResend(item.id)} />
              <PremiumButton title="Revoke" variant="ghost" icon="close-circle-outline" onPress={() => handleRevoke(item.id)} />
            </View>
          ) : null}
        </PremiumCard>
      )}
    />
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  inviteIcon: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  inviteIconText: {
    color: colors.gold,
    fontFamily: typography.bold,
    fontSize: 12,
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
    fontSize: 12,
    marginTop: 3,
  },
  actions: {
    gap: 10,
    marginTop: 12,
  },
});

export default AdminLawyerInvitesScreen;
