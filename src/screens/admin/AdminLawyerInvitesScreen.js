import React, { useEffect, useState } from 'react';
import {StyleSheet View} from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import { authService } from '../../services/authService';
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

import AppText from '../../components/common/AppText';
const AdminLawyerInvitesScreen = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingInviteId, setEditingInviteId] = useState(null);
  const [editingEmail, setEditingEmail] = useState('');
  const [busyAction, setBusyAction] = useState(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const response = await authService.getLawyerInvites();
      setInvites(pickList(response, ['data']));
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
    setBusyAction(`resend:${inviteId}`);
    try {
      await authService.resendLawyerInvite(inviteId);
      Toast.show({ type: 'success', text1: 'Invite resent' });
      await loadInvites();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not resend invite'),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const startEmailEdit = (invite) => {
    setEditingInviteId(invite.id);
    setEditingEmail(invite.lawyer_email || '');
  };

  const cancelEmailEdit = () => {
    setEditingInviteId(null);
    setEditingEmail('');
  };

  const handleEmailUpdate = async (inviteId) => {
    const lawyerEmail = editingEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(lawyerEmail)) {
      Toast.show({
        type: 'error',
        text1: 'Check the email',
        text2: 'Enter a valid lawyer email address.',
      });
      return;
    }

    setBusyAction(`email:${inviteId}`);
    try {
      await authService.updateLawyerInviteEmail(inviteId, lawyerEmail);
      cancelEmailEdit();
      Toast.show({ type: 'success', text1: 'Invite email updated' });
      await loadInvites();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not update the invite email'),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const getStatus = (invite) => {
    if (invite.status === 'accepted') return 'accepted';
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return 'expired';
    }
    return invite.status || 'pending';
  };

  const formatDate = (value) => (
    value ? new Date(value).toLocaleString() : 'Not available'
  );

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
          subtitle="Monitor invitations, refresh access and correct pending invite email addresses."
          icon="briefcase-outline"
          right={<StatusPill label={`${invites.length} invites`} color={colors.blue} />}
        />
      }
      renderItem={({ item }) => (
        <PremiumCard>
          <View style={styles.cardHeader}>
            <View style={styles.inviteIcon}>
              <AppText style={styles.inviteIconText}>LG</AppText>
            </View>
            <View style={styles.cardCopy}>
              <AppText style={styles.cardTitle}>{item.lawyer_email || 'No email provided'}</AppText>
              <AppText style={styles.cardMeta}>
                {item.lawyer_name || `Invited by ${item.assigned_by_name || item.client_name || 'an administrator'}`}
              </AppText>
            </View>
          </View>
          <InfoRow icon="mail-outline" label="Status" value={getStatus(item)} />
          <InfoRow icon="person-outline" label="Assigned by" value={item.assigned_by_name || item.client_name} />
          <InfoRow icon="time-outline" label="Expires" value={formatDate(item.expires_at)} />
          <InfoRow icon="paper-plane-outline" label="Last sent" value={formatDate(item.last_sent_at)} />
          <InfoRow icon="refresh-outline" label="Resends" value={String(item.resent_count ?? 0)} />
          {item.accepted_at ? (
            <InfoRow icon="checkmark-done-outline" label="Accepted" value={formatDate(item.accepted_at)} />
          ) : null}

          {editingInviteId === item.id ? (
            <View style={styles.editPanel}>
              <Input
                label="New lawyer email"
                value={editingEmail}
                onChangeText={setEditingEmail}
                placeholder="lawyer@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={styles.emailInput}
              />
              <View style={styles.actions}>
                <PremiumButton
                  title="Save and resend"
                  icon="checkmark-circle-outline"
                  loading={busyAction === `email:${item.id}`}
                  onPress={() => handleEmailUpdate(item.id)}
                />
                <PremiumButton
                  title="Cancel"
                  variant="secondary"
                  icon="close-outline"
                  disabled={busyAction === `email:${item.id}`}
                  onPress={cancelEmailEdit}
                />
              </View>
            </View>
          ) : null}

          {item.status !== 'accepted' && editingInviteId !== item.id ? (
            <View style={styles.actions}>
              <PremiumButton
                title="Resend invite"
                icon="send-outline"
                loading={busyAction === `resend:${item.id}`}
                onPress={() => handleResend(item.id)}
              />
              <PremiumButton
                title="Change email"
                variant="secondary"
                icon="create-outline"
                disabled={Boolean(busyAction)}
                onPress={() => startEmailEdit(item)}
              />
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
    fontSize: 13,
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
  actions: {
    gap: 10,
    marginTop: 12,
  },
  editPanel: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  emailInput: {
    marginBottom: 4,
  },
});

export default AdminLawyerInvitesScreen;
