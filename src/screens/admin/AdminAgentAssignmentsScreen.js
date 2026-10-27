import { translateUi as ui } from '../../i18n/interfaceRuntime.cjs';
import useInterfaceLanguage from '../../i18n/useInterfaceLanguage';
import React, { useEffect, useState } from 'react';
import {StyleSheet, View} from 'react-native';
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
import { colors, typography, typeScale } from '../../theme';

import AppText from '../../components/common/AppText';
const getStatusColor = (status) => {
  if (status === 'active') return colors.success;
  if (status === 'revoked') return colors.danger;
  return colors.warning;
};

const AdminAgentAssignmentsScreen = () => {
  useInterfaceLanguage();
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
        text1: ui("Failed"),
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
      Toast.show({ type: 'error', text1: ui("Landlord ID and Agent ID are required") });
      return;
    }

    setActionId('create');
    try {
      await adminAgentService.createAssignment({
        landlordId: Number(form.landlordId),
        agentId: Number(form.agentId),
      });
      Toast.show({ type: 'success', text1: ui("Assignment created") });
      setForm({ landlordId: '', agentId: '' });
      await loadAssignments();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Create failed"),
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
        text1: ui("Assignment {value0}", {value0: (action === 'reactivate' ? ui("reactivated") : `${action}d`)}),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: ui("Action failed"),
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
        eyebrow={ui("Admin delegation")}
        title={ui("Agent assignments")}
        subtitle={ui("Assign agents to landlords and manage delegated account access from a premium native workflow.")}
        icon="people-circle-outline"
      />

      <PremiumCard>
        <AppText style={styles.formTitle}>{ui("Create assignment")}</AppText>
        <Input
          label={ui("Landlord user ID")}
          value={form.landlordId}
          keyboardType="number-pad"
          onChangeText={(value) => setForm((prev) => ({ ...prev, landlordId: value }))}
          icon="home-outline"
        />
        <Input
          label={ui("Agent user ID")}
          value={form.agentId}
          keyboardType="number-pad"
          onChangeText={(value) => setForm((prev) => ({ ...prev, agentId: value }))}
          icon="person-add-outline"
        />
        <PremiumButton
          title={ui("Assign agent")}
          onPress={createAssignment}
          loading={actionId === 'create'}
          icon="link-outline"
        />
      </PremiumCard>

      <PremiumSectionTitle
        title={ui("Current assignments")}
        subtitle={ui("Active and recoverable delegation records.")}
      />

      {loading ? <PremiumCenter loading title={ui("Loading assignments")} /> : null}
      {!loading && assignments.length === 0 ? (
        <EmptyPanel
          title={ui("No assignments found")}
          message={ui("Create an assignment above to connect a landlord with an agent.")}
          icon="people-outline"
        />
      ) : null}

      {!loading && assignments.map((item) => {
        const status = item.status || 'active';
        return (
          <PremiumCard key={String(item.id)}>
            <View style={styles.rowHeader}>
              <View style={styles.rowTitleBlock}>
                <AppText style={styles.name}>{item.agent_name || ui("Agent #{value0}", {value0: (item.agent_user_id)})}</AppText>
                <AppText style={styles.meta}>{ui("Landlord: ")}{item.landlord_name || item.landlord_user_id}</AppText>
              </View>
              <StatusPill label={status} color={getStatusColor(status)} />
            </View>
            <InfoRow icon="finger-print-outline" label={ui("Assignment ID")} value={item.id} />

            <View style={styles.actions}>
              {status === "active" ? (
                <>
                  <PremiumButton
                    title={ui("Deactivate")}
                    variant="secondary"
                    onPress={() => setPendingAction({ item, action: 'deactivate' })}
                    loading={actionId === `${item.id}-deactivate`}
                    style={styles.actionButton}
                  />
                  <PremiumButton
                    title={ui("Revoke")}
                    variant="ghost"
                    onPress={() => setPendingAction({ item, action: 'revoke' })}
                    loading={actionId === `${item.id}-revoke`}
                    style={styles.actionButton}
                  />
                </>
              ) : (
                <PremiumButton
                  title={ui("Reactivate")}
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
        title={ui("{value0} agent assignment", {value0: (actionLabel)})}
        message={ui("Record why access for {value0} is being {value1}d.", {value0: (pendingAction?.item?.agent_name || ui("this agent")), value1: (actionLabel.toLowerCase())})}
        label={ui("Governance note")}
        placeholder={ui("Enter the operational reason for this change")}
        confirmText={ui("{value0} assignment", {value0: (actionLabel)})}
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
    fontFamily: typography.semibold,
    fontSize: typeScale.md,
    lineHeight: 26,
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
    fontSize: typeScale.base,
    lineHeight: 24,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: typeScale.xs,
    lineHeight: 18,
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
