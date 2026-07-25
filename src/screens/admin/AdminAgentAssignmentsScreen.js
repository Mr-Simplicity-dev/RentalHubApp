import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Input from '../../components/common/Input';
import OperationNoteModal from '../../components/admin/OperationNoteModal';
import {
  EmptyPanel,
  InfoRow,
  PremiumButton,
  PremiumCard,
  PremiumCenter,
  PremiumHero,
  PremiumScreen,
  PremiumSectionTitle,
  StatusPill,
} from '../../components/common/PremiumLayout';
import { adminAgentService } from '../../services/adminAgentService';
import { getErrorMessage, pickList } from '../../utils/http';
import { colors, typography } from '../../theme';

const getStatusColor = (status) => {
  if (status === 'active') return colors.success;
  if (status === 'revoked') return colors.danger;
  return colors.warning;
};

const AdminAgentAssignmentsScreen = () => {
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ landlordId: '', agentId: '' });
  const [pendingAction, setPendingAction] = useState(null);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const response = await adminAgentService.getAssignments({ limit: 50 });
      setAssignments(pickList(response, ['data']));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: getErrorMessage(error, 'Could not load assignments'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const createAssignment = async () => {
    if (!form.landlordId || !form.agentId) {
      Toast.show({ type: 'error', text1: 'Landlord ID and Agent ID are required' });
      return;
    }

    setActionId('create');
    try {
      await adminAgentService.createAssignment({
        landlordId: Number(form.landlordId),
        agentId: Number(form.agentId),
      });
      Toast.show({ type: 'success', text1: 'Assignment created' });
      setForm({ landlordId: '', agentId: '' });
      await loadAssignments();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Create failed',
        text2: getErrorMessage(error, 'Could not create assignment'),
      });
    } finally {
      setActionId(null);
    }
  };

  const setActiveState = async (reason) => {
    if (!pendingAction?.item?.id || !pendingAction?.action) return;

    const { item, action } = pendingAction;
    setActionId(`${item.id}-${action}`);
    try {
      if (action === 'revoke') {
        await adminAgentService.revokeAssignment(item.id, reason);
      } else if (action === 'deactivate') {
        await adminAgentService.deactivateAssignment(item.id, reason);
      } else if (action === 'reactivate') {
        await adminAgentService.reactivateAssignment(item.id, reason);
      }
      setPendingAction(null);
      await loadAssignments();
      Toast.show({
        type: 'success',
        text1: `Assignment ${action === 'reactivate' ? 'reactivated' : `${action}d`}`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Action failed',
        text2: getErrorMessage(error, 'Could not update assignment status'),
      });
    } finally {
      setActionId(null);
    }
  };

  const actionLabel = pendingAction?.action === 'reactivate'
    ? 'Reactivate'
    : pendingAction?.action === 'deactivate'
      ? 'Deactivate'
      : 'Revoke';

  return (
    <>
      <PremiumScreen>
      <PremiumHero
        eyebrow="Admin delegation"
        title="Agent assignments"
        subtitle="Assign agents to landlords and manage delegated account access from a premium native workflow."
        icon="people-circle-outline"
      />

      <PremiumCard>
        <Text style={styles.formTitle}>Create assignment</Text>
        <Input
          label="Landlord user ID"
          value={form.landlordId}
          keyboardType="number-pad"
          onChangeText={(value) => setForm((prev) => ({ ...prev, landlordId: value }))}
          icon="home-outline"
        />
        <Input
          label="Agent user ID"
          value={form.agentId}
          keyboardType="number-pad"
          onChangeText={(value) => setForm((prev) => ({ ...prev, agentId: value }))}
          icon="person-add-outline"
        />
        <PremiumButton
          title="Assign agent"
          onPress={createAssignment}
          loading={actionId === 'create'}
          icon="link-outline"
        />
      </PremiumCard>

      <PremiumSectionTitle
        title="Current assignments"
        subtitle="Active and recoverable delegation records."
      />

      {loading ? <PremiumCenter loading title="Loading assignments" /> : null}
      {!loading && assignments.length === 0 ? (
        <EmptyPanel
          title="No assignments found"
          message="Create an assignment above to connect a landlord with an agent."
          icon="people-outline"
        />
      ) : null}

      {!loading && assignments.map((item) => {
        const status = item.status || 'active';
        return (
          <PremiumCard key={String(item.id)}>
            <View style={styles.rowHeader}>
              <View style={styles.rowTitleBlock}>
                <Text style={styles.name}>{item.agent_name || `Agent #${item.agent_user_id}`}</Text>
                <Text style={styles.meta}>Landlord: {item.landlord_name || item.landlord_user_id}</Text>
              </View>
              <StatusPill label={status} color={getStatusColor(status)} />
            </View>
            <InfoRow icon="finger-print-outline" label="Assignment ID" value={item.id} />

            <View style={styles.actions}>
              {status === 'active' ? (
                <>
                  <PremiumButton
                    title="Deactivate"
                    variant="secondary"
                    onPress={() => setPendingAction({ item, action: 'deactivate' })}
                    loading={actionId === `${item.id}-deactivate`}
                    style={styles.actionButton}
                  />
                  <PremiumButton
                    title="Revoke"
                    variant="ghost"
                    onPress={() => setPendingAction({ item, action: 'revoke' })}
                    loading={actionId === `${item.id}-revoke`}
                    style={styles.actionButton}
                  />
                </>
              ) : (
                <PremiumButton
                  title="Reactivate"
                  onPress={() => setPendingAction({ item, action: 'reactivate' })}
                  loading={actionId === `${item.id}-reactivate`}
                  style={styles.fullButton}
                />
              )}
            </View>
          </PremiumCard>
        );
      })}
      </PremiumScreen>
      <OperationNoteModal
        visible={Boolean(pendingAction)}
        title={`${actionLabel} agent assignment`}
        message={`Record why access for ${pendingAction?.item?.agent_name || 'this agent'} is being ${actionLabel.toLowerCase()}d.`}
        label="Governance note"
        placeholder="Enter the operational reason for this change"
        confirmText={`${actionLabel} assignment`}
        icon={pendingAction?.action === 'reactivate' ? 'refresh-circle-outline' : 'shield-outline'}
        variant={pendingAction?.action === 'reactivate' ? 'primary' : 'danger'}
        loading={Boolean(actionId)}
        onCancel={() => setPendingAction(null)}
        onConfirm={setActiveState}
      />
    </>
  );
};

const styles = StyleSheet.create({
  formTitle: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 17,
    marginBottom: 12,
  },
  rowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  rowTitleBlock: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
  },
  fullButton: {
    flex: 1,
  },
});

export default AdminAgentAssignmentsScreen;
